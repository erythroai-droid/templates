'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { adSource, DEMO, trackDemo, waLink } from '@/lib/demo';
import { fbTrack } from '@/lib/metaPixel';

type State = 'open' | 'mini';
type Trigger = 'scroll' | 'footer' | 'timer' | 'exit' | 'reload';
const KEY = 'demo-notice';

/**
 * Demo notice. The round WhatsApp button is in the corner from the first second; the card ("thanks for viewing,
 * contact us") unfolds from it on its own once per visit — after DEMO.delayMs, once the visitor scrolls past the
 * first screen, when the footer comes into view, or when the mouse heads for the tab bar — and folds back into the
 * button when closed. On a reload in the same visit it unfolds again right away.
 */
export default function DemoNotice() {
  const { t, lang } = useI18n();
  const [state, setState] = useState<State>('mini');
  const stateRef = useRef<State>('mini');
  const autoDone = useRef(false);   // the one automatic unfold per page view has happened (or the visitor opened it first)
  const touchY = useRef<number | null>(null);
  const openedBy = useRef('');
  const [src, setSrc] = useState('');   // ad source from the landing URL, appended to the WhatsApp message

  useEffect(() => { setSrc(adSource()); }, []);

  const go = useCallback((s: State) => { stateRef.current = s; setState(s); }, []);
  const open = useCallback((trigger: Trigger) => {
    if (autoDone.current || stateRef.current === 'open') return;
    autoDone.current = true;
    go('open');
    openedBy.current = trigger;
    trackDemo('demo_notice_shown', { trigger });
    try { sessionStorage.setItem(KEY, '1'); } catch { /* storage unavailable */ }
  }, [go]);
  const close = useCallback((via: 'close' | 'esc' | 'swipe') => {
    if (stateRef.current !== 'open') return;
    go('mini');
    trackDemo('demo_notice_closed', { via });
  }, [go]);
  const reopen = () => {
    autoDone.current = true;
    go('open');
    openedBy.current = 'button';
    trackDemo('demo_notice_reopened');
  };

  useEffect(() => {
    if (!DEMO.enabled) return;
    let seen = false;
    try { seen = sessionStorage.getItem(KEY) === '1'; } catch { /* storage unavailable */ }
    // already shown this visit (reload, Ctrl+F5): open the card again rather than a bare WhatsApp button,
    // so the message itself is always seen; it collapses only when the visitor closes it
    if (seen) {
      const again = window.setTimeout(() => open('reload'), 1200);
      return () => clearTimeout(again);
    }

    const timer = window.setTimeout(() => open('timer'), DEMO.delayMs);

    // scrolled past the first screen = actually looking at the page
    const onScroll = () => { if (window.scrollY > window.innerHeight * DEMO.openAfterScreens) open('scroll'); };
    window.addEventListener('scroll', onScroll, { passive: true });

    // reached the footer = has seen the whole page
    let io: IntersectionObserver | undefined;
    const watchFooter = () => {
      const ftr = document.querySelector('#contact');
      if (!ftr || io) return;
      io = new IntersectionObserver(([e]) => { if (e.isIntersecting) open('footer'); }, { threshold: 0.35 });
      io.observe(ftr);
    };
    watchFooter();
    const late = window.setTimeout(watchFooter, 3000);

    // desktop exit intent: pointer leaves through the top edge
    const exit = (e: MouseEvent) => { if (!e.relatedTarget && e.clientY <= 0) open('exit'); };
    document.addEventListener('mouseout', exit);

    return () => {
      clearTimeout(timer); clearTimeout(late); io?.disconnect();
      window.removeEventListener('scroll', onScroll); document.removeEventListener('mouseout', exit);
    };
  }, [open, go]);

  useEffect(() => {
    if (state !== 'open') return;
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') close('esc'); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [state, close]);

  if (!DEMO.enabled) return null;

  return (
    <>
      <aside
        className={`demo ${state === 'open' ? 'on' : ''}`}
        aria-labelledby="demo-h"
        aria-hidden={state !== 'open'}
        onTouchStart={(e) => { touchY.current = e.touches[0].clientY; }}
        onTouchEnd={(e) => {
          if (touchY.current !== null && e.changedTouches[0].clientY - touchY.current > 60) close('swipe');   // swipe down to dismiss
          touchY.current = null;
        }}
      >
        <button className="demo-x" aria-label={t('close')} tabIndex={state === 'open' ? 0 : -1} onClick={() => close('close')}>
          <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.3" /></svg>
        </button>
        <h3 id="demo-h">{t('demo_h')}</h3>
        <p>{t('demo_p')}</p>
        <div className="demo-act">
          <a className="demo-wa" href={waLink(t('demo_msg'), src)} target="_blank" rel="noopener noreferrer" tabIndex={state === 'open' ? 0 : -1}
            onClick={() => {
              trackDemo('demo_whatsapp_click', { opened_by: openedBy.current || 'button', lang, ...(src ? { source: src } : {}) });
              fbTrack('Contact', { content_name: 'whatsapp' });
              fbTrack('Lead', { content_name: 'whatsapp' });
            }}>
            <WaIcon /> {t('demo_wa')}
          </a>
        </div>
      </aside>
      <button
        className={`demo-mini ${state === 'mini' ? 'on' : ''}`}
        aria-label={t('demo_open')}
        tabIndex={state === 'mini' ? 0 : -1}
        onClick={reopen}
      >
        <WaIcon />
      </button>
    </>
  );
}

function WaIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 2.8a9.2 9.2 0 0 0-7.9 13.9L3 21l4.4-1.1A9.2 9.2 0 1 0 12 2.8z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M9.1 7.6c-.3 0-.7.1-.9.5-.3.5-.6 1.2-.4 2.1.4 1.7 2.4 4.1 4.9 5 1 .4 1.8.2 2.3-.2.4-.3.6-.8.5-1.1l-1.5-.9c-.3-.2-.6-.1-.8.2l-.4.5c-1.2-.5-2.2-1.5-2.7-2.6l.5-.4c.3-.2.3-.5.2-.8l-.8-1.7c-.1-.2-.3-.4-.6-.4z" fill="currentColor" />
    </svg>
  );
}
