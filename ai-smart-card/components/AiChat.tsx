'use client';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { gsap, lockScroll } from '@/lib/scroll';

type Entry = { id: number; from: 'ai' | 'me'; k?: string; raw?: string };
const QUICK = [1, 2, 3, 4] as const;

/** Demo AI consultant (Ferrari AiChat pattern): canned answers, no API. Swap `ask` for a real /api/consult later. */
export default function AiChat() {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<Entry[]>([{ id: 0, from: 'ai', k: 'ai_hello' }]);
  const [typing, setTyping] = useState(false);
  const [text, setText] = useState('');
  const seq = useRef(0);
  const list = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => { list.current?.scrollTo({ top: list.current.scrollHeight, behavior: 'smooth' }); }, [entries, typing, open]);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    if (!open) return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('keydown', esc);
    const phone = matchMedia('(max-width: 900px)').matches;
    if (phone) lockScroll(true);
    if (panel.current) gsap.fromTo(panel.current, { y: 24, opacity: 0, scale: 0.97 }, { y: 0, opacity: 1, scale: 1, duration: 0.45, ease: 'power3.out' });
    return () => { document.removeEventListener('keydown', esc); if (phone) lockScroll(false); };
  }, [open]);

  const ask = (raw: string, q?: number) => {
    const v = raw.trim();
    if (!v || typing) return;
    setEntries((m) => [...m, { id: ++seq.current, from: 'me', raw: v }]);
    setText('');
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      setEntries((m) => [...m, { id: ++seq.current, from: 'ai', k: q ? `ai_a${q}` : 'ai_a0' }]);
    }, 900 + Math.random() * 600);
  };
  const submit = (e: FormEvent) => { e.preventDefault(); ask(text); };

  return (
    <>
      <button className={`ai-fab ${open ? 'hide' : ''}`} onClick={() => setOpen(true)} aria-label={t('ai_open')} aria-expanded={open}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden><path d="M4 5h16v11H9l-5 4V5z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /><path d="M9 10h6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
        <span>{t('ai_open')}</span>
      </button>
      {open && (
        <div className="ai" ref={panel} role="dialog" aria-label={t('ai_title')} data-lenis-prevent>
          <div className="ai-head">
            <div><b>{t('ai_title')}</b><small>{t('ai_sub')}</small></div>
            <button className="ai-x" onClick={() => setOpen(false)} aria-label={t('close')}>
              <svg width="14" height="14" viewBox="0 0 16 16"><path d="M1 1l14 14M15 1L1 15" stroke="currentColor" strokeWidth="1.3" /></svg>
            </button>
          </div>
          <div className="ai-list" ref={list} aria-live="polite">
            {entries.map((m) => <p key={m.id} className={`ai-msg ${m.from === 'ai' ? 'bot' : 'me'}`}>{m.raw ?? t(m.k!)}</p>)}
            {typing && <p className="ai-msg bot ai-typing" role="status" aria-label={t('ai_typing')}><i /><i /><i /></p>}
          </div>
          <div className="ai-quick">
            {QUICK.map((n) => <button key={n} onClick={() => ask(t(`ai_q${n}`), n)} disabled={typing}>{t(`ai_q${n}`)}</button>)}
          </div>
          <form className="ai-form" onSubmit={submit}>
            <input value={text} onChange={(e) => setText(e.target.value)} placeholder={t('ai_ph')} aria-label={t('ai_ph')} />
            <button type="submit" aria-label={t('ai_send')} disabled={!text.trim() || typing}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden><path d="M2 8h12M9 3l5 5-5 5" stroke="currentColor" strokeWidth="1.3" /></svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
