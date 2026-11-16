"""
Deploy the "<Brand Model> — Lead form → Telegram" n8n workflow for this site (self-hosted n8n in Docker over SSH).

  Webhook POST <N8N_URL>/webhook/<slug>-lead   (Header Auth: X-Webhook-Secret = LEAD_WEBHOOK_SECRET)
    → Code: format the lead (HTML-escaped)
    → Telegram sendMessage — bot credential + chat id are copied from an existing workflow (N8N_TG_WORKFLOW),
      so no Telegram token ever passes through this script.

The site side is app/api/lead/route.ts: set LEAD_WEBHOOK_URL + LEAD_WEBHOOK_SECRET in Vercel → Environment Variables.

Env (read from the shell or from the file in ENV_FILE; secrets are never printed):
  N8N_SSH_HOST, N8N_SSH_USER (root), N8N_SSH_PASSWORD   — the VPS running the n8n container
  N8N_URL            https://n8n.example.com              — public n8n base (health check + printed webhook URL)
  N8N_CONTAINER      n8n                                   — docker container name
  N8N_COMPOSE_DIR    /root/n8n                             — where `docker compose restart n8n` runs
  N8N_TG_WORKFLOW    id of a live workflow with a Telegram node to copy the bot + chat from
  LEAD_WEBHOOK_SECRET  16+ chars, same value as in Vercel
  SITE_SLUG          defaults to package.json "name"

Usage:
  pip install paramiko python-dotenv
  py -3 scripts/deploy-n8n-lead.py
Re-running updates the same workflow / credential (ids are derived from the slug).
"""
from __future__ import annotations

import json
import os
import re
import time
import urllib.request
from pathlib import Path

import paramiko
from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
if os.environ.get("ENV_FILE"):
    load_dotenv(os.environ["ENV_FILE"])
load_dotenv(ROOT / ".env.local")


def need(k: str) -> str:
    v = (os.environ.get(k) or "").strip()
    if not v:
        raise SystemExit(f"Set {k}")
    return v


HOST = need("N8N_SSH_HOST")
USER = os.environ.get("N8N_SSH_USER", "root")
PASSWORD = need("N8N_SSH_PASSWORD")
N8N_URL = need("N8N_URL").rstrip("/")
CONTAINER = os.environ.get("N8N_CONTAINER", "n8n")
COMPOSE_DIR = os.environ.get("N8N_COMPOSE_DIR", "/root/n8n")
TG_WF = need("N8N_TG_WORKFLOW")
SECRET = (os.environ.get("LEAD_WEBHOOK_SECRET") or "").strip()

SLUG = os.environ.get("SITE_SLUG") or json.loads((ROOT / "package.json").read_text("utf-8"))["name"]
site_ts = (ROOT / "lib" / "site.ts").read_text("utf-8")
BRAND = re.search(r"export const BRAND = '([^']*)'", site_ts).group(1)
MODEL = re.search(r"export const MODEL = '([^']*)'", site_ts).group(1)
NAME = f"{BRAND} {MODEL}"

WF_ID = f"{SLUG}-lead-form"[:36]
CRED_ID = re.sub(r"[^A-Za-z0-9]", "", f"{SLUG}LeadSecret")[:24]
CRED_NAME = f"{NAME} lead webhook secret"
PATH = f"{SLUG}-lead"

FORMAT_JS = r"""
const b = $json.body || {};
// sent with parse_mode HTML: escape user input so "_", "*", "<" never break the message
const esc = (s) => String(s).slice(0, 1500).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const line = (k, v) => (v ? `<b>${k}:</b> ${esc(v)}` : null);
const text = [
  '📩 <b>__NAME__ — новая заявка с сайта</b>',
  '',
  line('Имя', b.name),
  line('Email', b.email),
  line('Сообщение', b.message),
  '',
  line('Язык', b.lang),
  line('Источник', b.source || 'прямой заход'),
  line('Страница', b.page),
  line('Время', b.createdAt),
].filter((x) => x !== null).join('\n');
return [{ json: { text: text.slice(0, 4000) } }];
""".replace("__NAME__", NAME.replace("'", "\\'"))


def sh(c: paramiko.SSHClient, cmd: str) -> str:
    _, out, err = c.exec_command(cmd)
    code = out.channel.recv_exit_status()
    o, e = out.read().decode(), err.read().decode()
    if code:
        raise RuntimeError(f"failed ({code}): {cmd.split('&&')[0][:120]}\n{(e or o)[-800:]}")
    return o


def main() -> None:
    if len(SECRET) < 16:
        raise SystemExit("Set LEAD_WEBHOOK_SECRET (16+ chars)")

    c = paramiko.SSHClient()
    c.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    c.connect(HOST, username=USER, password=PASSWORD, timeout=30)
    sftp = c.open_sftp()
    tmp = f"/tmp/{SLUG}-lead-import"
    dx = f"docker exec -u node {CONTAINER} n8n"
    sh(c, f"mkdir -p {tmp} && chmod 700 {tmp}")

    # 1. Telegram credential + chat id from the existing workflow
    sh(c, f"{dx} export:workflow --id={TG_WF} --output=/tmp/tg-src.json "
          f"&& docker cp {CONTAINER}:/tmp/tg-src.json {tmp}/tg-src.json && docker exec -u root {CONTAINER} rm -f /tmp/tg-src.json")
    with sftp.open(f"{tmp}/tg-src.json") as fh:
        src = json.loads(fh.read().decode())
    src = src[0] if isinstance(src, list) else src
    tg = next(n for n in src["nodes"] if n["type"] == "n8n-nodes-base.telegram")
    tg_cred = tg["credentials"]["telegramApi"]
    chat_id = str(tg["parameters"]["chatId"])
    print(f"[n8n] telegram node found: credential '{tg_cred['name']}'")

    # 2. header-auth credential  3. workflow
    creds = [{"id": CRED_ID, "name": CRED_NAME, "type": "httpHeaderAuth",
              "data": {"name": "X-Webhook-Secret", "value": SECRET}}]
    wf = {
        "id": WF_ID,
        "name": f"{NAME} — Lead form → Telegram",
        "active": False,
        "settings": {"executionOrder": "v1"},
        "connections": {
            "Lead webhook": {"main": [[{"node": "Format lead", "type": "main", "index": 0}]]},
            "Format lead": {"main": [[{"node": "Send to Telegram", "type": "main", "index": 0}]]},
        },
        "nodes": [
            {"id": "a1", "name": "Lead webhook", "type": "n8n-nodes-base.webhook", "typeVersion": 2,
             "position": [0, 0], "webhookId": f"{WF_ID}-hook",
             "parameters": {"httpMethod": "POST", "path": PATH, "authentication": "headerAuth",
                            "responseMode": "onReceived", "options": {}},
             "credentials": {"httpHeaderAuth": {"id": CRED_ID, "name": CRED_NAME}}},
            {"id": "a2", "name": "Format lead", "type": "n8n-nodes-base.code", "typeVersion": 2,
             "position": [240, 0], "parameters": {"jsCode": FORMAT_JS}},
            {"id": "a3", "name": "Send to Telegram", "type": "n8n-nodes-base.telegram", "typeVersion": 1.2,
             "position": [480, 0],
             "parameters": {"operation": "sendMessage", "chatId": chat_id, "text": "={{ $json.text }}",
                            "additionalFields": {"appendAttribution": False, "disable_web_page_preview": True,
                                                 "parse_mode": "HTML"}},
             "credentials": {"telegramApi": {"id": tg_cred["id"], "name": tg_cred["name"]}}},
        ],
    }
    for name, data in (("credentials.json", creds), ("workflow.json", [wf])):
        with sftp.open(f"{tmp}/{name}", "w") as fh:
            fh.write(json.dumps(data, ensure_ascii=False))
    print("[n8n] import credential + workflow")
    sh(c, f"docker cp {tmp}/credentials.json {CONTAINER}:/tmp/lead-cred.json && docker cp {tmp}/workflow.json {CONTAINER}:/tmp/lead-wf.json "
          f"&& {dx} import:credentials --input=/tmp/lead-cred.json "
          f"&& {dx} import:workflow --input=/tmp/lead-wf.json "
          f"&& docker exec -u root {CONTAINER} rm -f /tmp/lead-cred.json /tmp/lead-wf.json")
    sh(c, f"rm -rf {tmp}")

    print("[n8n] publish + restart")
    try:
        sh(c, f"{dx} publish:workflow --id={WF_ID}")
    except RuntimeError:
        sh(c, f"{dx} update:workflow --id={WF_ID} --active=true")
    sh(c, f"cd {COMPOSE_DIR} && docker compose restart {CONTAINER}")
    for i in range(30):
        try:
            if urllib.request.urlopen(f"{N8N_URL}/healthz", timeout=5).status == 200:
                print(f"[n8n] healthz ok ({i + 1})")
                break
        except Exception:
            pass
        time.sleep(3)
    c.close()
    print(f"\nLEAD_WEBHOOK_URL = {N8N_URL}/webhook/{PATH}   (set it + LEAD_WEBHOOK_SECRET in Vercel, then redeploy)")


if __name__ == "__main__":
    main()
