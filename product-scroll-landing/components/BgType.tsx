'use client';
import { useEffect, useRef } from 'react';
import { BRAND, MODEL } from '@/lib/site';
import { prefersReducedMotion } from '@/lib/scroll';

/**
 * Giant brand letters + gauge ring behind the watch — same compositional idea as
 * thewatch.60fps.fr ("FS 60" + segmented circle). Driven by the stage's --p (scroll)
 * and a soft mouse parallax.
 */
export default function BgType() {
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = root.current;
    if (!el || prefersReducedMotion()) return;
    let mx = 0, my = 0, tx = 0, ty = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      mx = ((e.clientX - r.left) / r.width - 0.5) * 2;
      my = ((e.clientY - r.top) / r.height - 0.5) * 2;
    };
    const tick = () => {
      tx += (mx - tx) * 0.06;
      ty += (my - ty) * 0.06;
      el.style.setProperty('--mx', tx.toFixed(3));
      el.style.setProperty('--my', ty.toFixed(3));
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove); };
  }, []);

  return (
    <div ref={root} className="bg-type" aria-hidden dir="ltr">
      <svg className="bg-gauge" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet">
        <circle cx="50" cy="50" r="46" pathLength="1" className="bg-gauge-track" />
        <circle cx="50" cy="50" r="46" pathLength="1" className="bg-gauge-fill" />
        <line x1="50" y1="4" x2="50" y2="12" className="bg-gauge-tick" />
        <line x1="50" y1="88" x2="50" y2="96" className="bg-gauge-tick" />
        <line x1="4" y1="50" x2="12" y2="50" className="bg-gauge-tick" />
        <line x1="88" y1="50" x2="96" y2="50" className="bg-gauge-tick" />
      </svg>
      <div className="bg-word bg-word-a">{BRAND}</div>
      <div className="bg-word bg-word-b">{MODEL}</div>
    </div>
  );
}
