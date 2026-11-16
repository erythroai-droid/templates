'use client';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import Modal from './Modal';
import Flag from './Flag';
import { LANGS, useI18n } from '@/lib/i18n';
import { goToSection, refreshScroll } from '@/lib/scroll';
import { BRAND, MODEL } from '@/lib/site';
import { adSource, trackDemo, waLink } from '@/lib/demo';
import { gaEvent } from '@/lib/ga';
import { fbTrack } from '@/lib/metaPixel';

// full-screen menu: one line per scene + contact
const NAV = [
  ['—', 'top_nav', '#top'],
  ['01', 'craft_nav', '#craft'],
  ['02', 'cuts_nav', '#cuts'],
  ['03', 'feast_nav', '#feast'],
  ['04', 'nav_contact', '#contact'],
] as const;

/** Any button on the page can open the order form: window.dispatchEvent(new Event(OPEN_CONTACT)). */
export const OPEN_CONTACT = 'open-contact';

type Which = null | 'menu' | 'contact';

export default function Header() {
  const { t, lang, dir, setLang } = useI18n();
  const [open, setOpen] = useState<Which>(null);
  const [langOpen, setLangOpen] = useState(false);
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState(false);
  const langBox = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(null), []);

  useEffect(() => {
    const on = () => { setSent(false); setErr(false); setOpen('contact'); };
    window.addEventListener(OPEN_CONTACT, on);
    return () => window.removeEventListener(OPEN_CONTACT, on);
  }, []);

  useEffect(() => {
    if (!langOpen) return;
    const off = (e: MouseEvent) => { if (!langBox.current?.contains(e.target as Node)) setLangOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setLangOpen(false); };
    document.addEventListener('mousedown', off); document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', off); document.removeEventListener('keydown', esc); };
  }, [langOpen]);

  useEffect(() => { const id = setTimeout(refreshScroll, 150); return () => clearTimeout(id); }, [lang]);   // text height changes with the language

  // the whole site is dark: light chrome always; a glass bar once the page has scrolled
  useEffect(() => {
    const hdr = document.querySelector('.hdr');
    if (!hdr) return;
    const sync = () => hdr.classList.toggle('scrolled', window.scrollY > 40);
    sync();
    window.addEventListener('scroll', sync, { passive: true });
    return () => window.removeEventListener('scroll', sync);
  }, []);

  const go = (hash: string) => { close(); setTimeout(() => goToSection(hash), 120); };
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (sending) return;
    const f = new FormData(e.currentTarget);
    const source = adSource();
    setSending(true); setErr(false);
    try {
      const res = await fetch('/api/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: f.get('name'), email: f.get('email'), message: f.get('msg'), company: f.get('company'),
          lang, source, page: window.location.href,
        }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setSent(true);
      fbTrack('Lead', { content_name: 'contact_form' });
      trackDemo('contact_form_submit', { lang, ...(source ? { source } : {}) });
      gaEvent('generate_lead', { method: 'form', lang, ...(source ? { source } : {}) });
    } catch {
      setErr(true);
      trackDemo('contact_form_error', { lang });
    } finally {
      setSending(false);
    }
  };
  const current = LANGS.find((l) => l.code === lang)!;

  return (
    <>
      <header className="hdr on-dark">
        <div className="hdr-l">
          <a href="#top" className="logo" dir="ltr" onClick={(e) => { e.preventDefault(); goToSection('#top'); }}>{BRAND}<sup>{MODEL}</sup></a>
          <button className="icon" aria-label={t('menu_open')} onClick={() => setOpen('menu')}>
            <svg width="18" height="10" viewBox="0 0 18 10"><path d="M0 1h18M0 9h18" stroke="currentColor" strokeWidth="1.2" /></svg>
          </button>
        </div>
        <p className="hdr-tag">{t('tagline')}</p>
        <div className="hdr-r">
          <div className="lang-wrap" ref={langBox}>
            <button
              className="lang"
              aria-haspopup="listbox"
              aria-expanded={langOpen}
              aria-label={`${current.label} — ${t('lang')}`}
              onClick={() => setLangOpen((v) => !v)}
            >
              <Flag code={current.code} size={18} /> <span>{current.label}</span>
            </button>
            {langOpen && (
              <ul className="lang-menu" role="listbox">
                {LANGS.map((l) => (
                  <li key={l.code} role="option" aria-selected={l.code === lang}>
                    <button className={l.code === lang ? 'on' : ''} onClick={() => { setLang(l.code); setLangOpen(false); }}>
                      <Flag code={l.code} size={18} /><span lang={l.code}>{l.name}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <button className="btn" onClick={() => { setSent(false); setOpen('contact'); }}>{t('reserve')}</button>
        </div>
      </header>

      <Modal open={open === 'menu'} onClose={close} label={t('menu_open')} variant="full">
        <nav className="menu">
          {NAV.map(([n, k, h]) => (
            <a key={h} href={h} onClick={(e) => { e.preventDefault(); go(h); }}><i dir="ltr">{n}</i><span>{t(k)}</span></a>
          ))}
          <p className="menu-foot">{t('menu_foot')}</p>
        </nav>
      </Modal>

      <Modal open={open === 'contact'} onClose={close} label={t('c_title')}>
        {sent ? (
          <div className="form-done">
            <small>{t('c_thanks')}</small>
            <h2>{t('c_done')}</h2>
            <p>{t('c_done_p')}</p>
            <button className="btn" onClick={close}>{t('close')}</button>
          </div>
        ) : (
          <form className="form" onSubmit={submit}>
            <small>{t('c_k')}</small>
            <h2>{t('c_title')}</h2>
            <label>{t('c_name')}<input required name="name" autoComplete="name" /></label>
            <label>{t('c_email')}<input required type="email" name="email" autoComplete="email" dir="ltr" /></label>
            <label>{t('c_msg')}<textarea name="msg" rows={4} defaultValue={t('c_msg_def')} /></label>
            {/* honeypot: hidden from people, bots fill it */}
            <input name="company" tabIndex={-1} autoComplete="off" aria-hidden style={{ position: 'absolute', left: '-9999px', width: 1, height: 1, opacity: 0 }} />
            {err && (
              <p className="form-err" role="alert">
                {t('c_err')}{' '}
                <a href={waLink(t('demo_msg'), adSource())} target="_blank" rel="noopener noreferrer">WhatsApp {dir === 'rtl' ? '←' : '→'}</a>
              </p>
            )}
            <button className="btn solid" type="submit" disabled={sending} aria-busy={sending}>
              {sending ? t('c_sending') : <>{t('c_send')} <span className="arr">→</span></>}
            </button>
          </form>
        )}
      </Modal>
    </>
  );
}
