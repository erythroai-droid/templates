'use client';
import { useEffect } from 'react';
import { adSource, trackDemo } from '@/lib/demo';
import { fbTrackCustom } from '@/lib/metaPixel';

/**
 * First-seconds metrics for ad traffic (Reels visitors decide within 1–3 s). Each fires once per page view, to GA4 + Vercel
 * (trackDemo) and, for the engaged signal, to the Meta Pixel:
 *   film_first_frame { ms }   — time from navigation start to the first real picture on screen (Film dispatches it)
 *   first_scroll { seconds }  — the visitor started scrolling (proof they are exploring, not bouncing)
 *   engaged_10s               — 10 s with the tab in front
 *   engaged_visit { via }     — first of the two above; Pixel custom event `EngagedVisit`. Build a Custom Conversion on it
 *                               in Events Manager and optimise the ads for it: leads alone are too few for Meta to learn from.
 * Mounted before <Film /> so its listener is in place before the first frame can paint.
 */
export default function Metrics() {
  useEffect(() => {
    const src = adSource();                     // utm_source / campaign / term of the landing URL (kept for the visit)
    const base = (extra: Record<string, string>) => ({ ...extra, ...(src ? { source: src } : {}) });
    let engaged = false;
    const engage = (via: string) => {
      if (engaged) return;
      engaged = true;
      trackDemo('engaged_visit', base({ via }));
      fbTrackCustom('EngagedVisit', { via });
    };

    const onFrame = (e: Event) => {
      trackDemo('film_first_frame', base({ ms: String((e as CustomEvent<number>).detail) }));
    };
    window.addEventListener('film-first-frame', onFrame, { once: true });

    const t0 = performance.now();
    const onScroll = () => {
      if (window.scrollY < 24) return;           // ignore restored / jitter positions
      window.removeEventListener('scroll', onScroll);
      trackDemo('first_scroll', base({ seconds: ((performance.now() - t0) / 1000).toFixed(1) }));
      engage('scroll');
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // visible time only: a tab opened in the background must not count as "stayed 10 s"
    let seen = 0, last = performance.now(), done10 = false;
    const tick = window.setInterval(() => {
      const now = performance.now();
      if (!document.hidden) seen += now - last;
      last = now;
      if (!done10 && seen >= 10_000) {
        done10 = true;
        trackDemo('engaged_10s', base({}));
        engage('10s');
        window.clearInterval(tick);
      }
    }, 500);

    return () => {
      window.removeEventListener('film-first-frame', onFrame);
      window.removeEventListener('scroll', onScroll);
      window.clearInterval(tick);
    };
  }, []);
  return null;
}
