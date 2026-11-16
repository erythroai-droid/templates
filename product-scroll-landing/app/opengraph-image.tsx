import { ImageResponse } from 'next/og';
import { BRAND, DESCRIPTION, MODEL } from '@/lib/site';

// Generated link preview (Facebook / WhatsApp / Telegram / X) so a fresh site never shares a blank card.
// For a real client replace it with a 1200x630 photo: app/opengraph-image.jpg + opengraph-image.alt.txt, then delete this file
// (and twitter-image.tsx, or add twitter-image.jpg the same way).
export const alt = `${BRAND} ${MODEL}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between',
          padding: '72px 80px', color: '#f3f1f4',
          background: 'radial-gradient(70% 90% at 80% 30%, #4a464e 0%, #2b282e 55%, #141216 100%)',
        }}
      >
        <div style={{ display: 'flex', fontSize: 22, letterSpacing: 8, textTransform: 'uppercase', color: '#d2ad72' }}>
          {BRAND}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ display: 'flex', fontSize: 150, fontWeight: 300, letterSpacing: -6, lineHeight: 1 }}>
            {BRAND}<span style={{ color: '#9c97a2', marginLeft: 24 }}>{MODEL}</span>
          </div>
          <div style={{ display: 'flex', width: 120, height: 2, background: '#d2ad72', margin: '36px 0 28px' }} />
          <div style={{ display: 'flex', fontSize: 30, color: '#b4afb9', maxWidth: 900, lineHeight: 1.35 }}>{DESCRIPTION}</div>
        </div>
      </div>
    ),
    size,
  );
}
