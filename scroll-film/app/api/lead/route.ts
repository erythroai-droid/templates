// Order form → webhook (n8n, Make, Zapier…). Set LEAD_WEBHOOK_URL in Vercel → Environment Variables (server-only,
// never exposed to the browser). Optional LEAD_WEBHOOK_SECRET is sent as the X-Webhook-Secret header so n8n can
// reject anything that didn't come from this site. The webhook receives JSON:
//   { name, email, message, lang, source, page, userAgent, createdAt }
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

const clip = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  const url = process.env.LEAD_WEBHOOK_URL;
  if (!url) return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 });

  let body: Record<string, unknown>;
  try { body = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'bad_json' }, { status: 400 }); }

  if (clip(body.company, 200)) return NextResponse.json({ ok: true });   // honeypot field filled = bot; pretend success

  const lead = {
    name: clip(body.name, 120),
    email: clip(body.email, 200),
    message: clip(body.message, 2000),
    lang: clip(body.lang, 5),
    source: clip(body.source, 120),
    page: clip(body.page, 500),
    userAgent: clip(req.headers.get('user-agent'), 300),
    createdAt: new Date().toISOString(),
  };
  if (!lead.name || !EMAIL.test(lead.email)) return NextResponse.json({ ok: false, error: 'invalid' }, { status: 400 });

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.LEAD_WEBHOOK_SECRET ? { 'X-Webhook-Secret': process.env.LEAD_WEBHOOK_SECRET } : {}),
      },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return NextResponse.json({ ok: false, error: `webhook_${res.status}` }, { status: 502 });
  } catch {
    return NextResponse.json({ ok: false, error: 'webhook_unreachable' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
