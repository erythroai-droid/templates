// Meta Pixel ID (Events Manager → Data sources) — "Erythro Ai" pixel.
// A client's build can use its own pixel via NEXT_PUBLIC_META_PIXEL_ID, or turn it off with NEXT_PUBLIC_META_PIXEL_ID=0.
export const META_PIXEL_ID = (process.env.NEXT_PUBLIC_META_PIXEL_ID ?? '2395401914532727').replace(/\D/g, '').replace(/^0$/, '');

type Fbq = (cmd: 'track' | 'trackCustom', name: string, data?: Record<string, string>) => void;

/** Standard event (e.g. 'Contact', 'Lead') — no-op when the pixel isn't loaded or is blocked. */
export const fbTrack = (name: string, data?: Record<string, string>) => {
  try { (window as unknown as { fbq?: Fbq }).fbq?.('track', name, data); } catch { /* blocked */ }
};
