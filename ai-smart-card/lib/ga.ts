// Google Analytics 4 measurement ID — "Erythro Ai" property.
// A client's build can use its own via NEXT_PUBLIC_GA_ID, or turn GA off with NEXT_PUBLIC_GA_ID=0.
// Loaded only in production builds, so local dev never pollutes the property.
export const GA_ID = (process.env.NEXT_PUBLIC_GA_ID ?? 'G-F3BTVWGDRS').trim().replace(/^0$/, '');
export const GA_ON = !!GA_ID && process.env.NODE_ENV === 'production';

type Gtag = (cmd: 'event', name: string, params?: Record<string, string | number>) => void;

/**
 * GA4 event — no-op when the tag isn't loaded or is blocked.
 * UTM params (utm_source / utm_campaign / utm_term …) need no code: gtag reads them from the landing URL.
 */
export const gaEvent = (name: string, params?: Record<string, string | number>) => {
  try { (window as unknown as { gtag?: Gtag }).gtag?.('event', name, params); } catch { /* blocked */ }
};
