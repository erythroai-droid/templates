import { track } from '@vercel/analytics';
import { gaEvent } from './ga';
import { BRAND, MODEL } from './site';

// "Thanks for viewing — contact us" notice shown on demo builds.
// Turn it off for a client's production build with NEXT_PUBLIC_DEMO_NOTICE=0 (Vercel → Environment Variables).
export const DEMO = {
  enabled: process.env.NEXT_PUBLIC_DEMO_NOTICE !== '0',
  /** WhatsApp number (used only in the wa.me link, not shown on the page) */
  phone: '+972505308305',
  /** the WhatsApp button shows from the start; the card unfolds on its own after this long… */
  delayMs: 3_500,   // most mobile ad visitors leave within 5–10 s (ORA 60A GA4, Nov 2026: ~1 s average engagement)
  /** …or once the visitor scrolls this many screens down (or reaches the footer / exit intent), whichever comes first */
  openAfterScreens: 1,
};

/**
 * Funnel events in Vercel Web Analytics (Analytics → Events):
 *   demo_notice_shown { trigger: timer | scroll | footer | exit | reload }
 *   demo_notice_closed { via: close | esc | swipe }
 *   demo_notice_reopened {}            — clicked the collapsed WhatsApp button
 *   demo_whatsapp_click { opened_by, lang, source? } — the conversion; source = adSource() when the visit came from an ad
 * In development they are only logged to the console.
 * The same events go to GA4 under the same names, except the conversion, which GA4 gets as
 * whatsapp_click + the recommended generate_lead { method: whatsapp } (mark it as a key event in GA4 → Admin → Events).
 */
export const trackDemo = (name: string, data?: Record<string, string>) => {
  try { track(name, data); } catch { /* analytics blocked or unavailable */ }
  if (name === 'demo_whatsapp_click') {
    gaEvent('whatsapp_click', data);
    gaEvent('generate_lead', { method: 'whatsapp', ...data });
  } else {
    gaEvent(name, data);
  }
};

const SRC_KEY = 'demo-src';

/**
 * Where the visitor came from, read from the landing URL: "utm_source / utm_campaign / utm_term"
 * (utm_term carries the Meta placement), or "facebook" / "google" from a bare fbclid / gclid.
 * Kept for the visit in sessionStorage so it survives a reload or a URL without the tags. '' for direct visits.
 */
export const adSource = (): string => {
  try {
    const q = new URLSearchParams(window.location.search);
    const utm = ['utm_source', 'utm_campaign', 'utm_term'].map((k) => q.get(k)?.trim()).filter(Boolean).join(' / ');
    const src = (utm || (q.has('fbclid') ? 'facebook' : q.has('gclid') ? 'google' : '')).slice(0, 120);
    if (src) { sessionStorage.setItem(SRC_KEY, src); return src; }
    return sessionStorage.getItem(SRC_KEY) ?? '';
  } catch { return ''; }
};

/**
 * wa.me link with the pre-filled message; the ad source, when known, goes on its own line at the end.
 * i18n demo_msg contains {name}, filled here with BRAND MODEL from lib/site.ts — no per-project edit needed.
 */
export const waLink = (text: string, src = '') => {
  const msg = text.replace('{name}', `${BRAND} ${MODEL}`);
  return `https://wa.me/${DEMO.phone.replace(/\D/g, '')}?text=${encodeURIComponent(src ? `${msg}\n\n[${src}]` : msg)}`;
};
