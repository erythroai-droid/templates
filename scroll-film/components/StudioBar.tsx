'use client';
import { useEffect, useState } from 'react';
import { useI18n } from '@/lib/i18n';
import { adSource, DEMO, trackDemo, waLink } from '@/lib/demo';
import { fbTrack } from '@/lib/metaPixel';
import { BRAND } from '@/lib/site';

/** Studio portfolio (one page for every language); utm marks the visits that came from this demo. */
const PORTFOLIO = `https://erythro.ai/portfolio?utm_source=demo-${BRAND.toLowerCase()}&utm_medium=studio_strip&utm_campaign=demo`;

/**
 * Studio frame for ad traffic (people from Reels leave within 1–3 s): from the very first frame the visitor sees
 * that this is a studio demo (top strip) and has one action (bottom CTA → WhatsApp with the ad source appended).
 * Replaces the delayed DemoNotice card. Off for client handover with NEXT_PUBLIC_DEMO_NOTICE=0 (DEMO.enabled).
 */
export default function StudioBar() {
  const { t, lang } = useI18n();
  const [src, setSrc] = useState('');
  useEffect(() => { setSrc(adSource()); }, []);
  useEffect(() => {
    if (!DEMO.enabled) return;
    document.documentElement.classList.add('has-studio');
    trackDemo('demo_notice_shown', { trigger: 'studio_bar' });
    return () => document.documentElement.classList.remove('has-studio');
  }, []);
  if (!DEMO.enabled) return null;

  const click = () => {
    trackDemo('demo_whatsapp_click', { opened_by: 'studio_bar', lang, ...(src ? { source: src } : {}) });
    fbTrack('Contact', { content_name: 'whatsapp' });
    fbTrack('Lead', { content_name: 'whatsapp' });
  };

  return (
    <>
      <div className="studio-strip" role="note">
        <span className="studio-tag"><i aria-hidden />{t('demo_strip')}</span>
        <a
          className="studio-more"
          href={PORTFOLIO}
          target="_blank"
          rel="noopener"
          onClick={() => trackDemo('demo_portfolio_click', { lang, ...(src ? { source: src } : {}) })}
        >
          {t('demo_more')} <span className="arr" aria-hidden>→</span>
        </a>
      </div>
      <div className="studio-bar">
        <a className="studio-cta" href={waLink(t('demo_msg'), src)} target="_blank" rel="noopener noreferrer" onClick={click}>
          <WaIcon />
          <span>{t('demo_cta')}</span>
          <span className="arr" aria-hidden>→</span>
        </a>
      </div>
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
