'use client';
import { useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion } from '@/lib/scroll';

// A number that counts up from 0 each time `on` turns true (inside a pinned stage, where CountUp's scroll trigger would fire too early).
export default function Num({ to, on, duration = 1.4 }: { to: number; on: boolean; duration?: number }) {
  const el = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const node = el.current!;
    if (!on || prefersReducedMotion()) { node.textContent = String(to); return; }
    const o = { v: 0 };
    const tw = gsap.to(o, { v: to, duration, ease: 'power3.out', onUpdate: () => { node.textContent = String(Math.round(o.v)); } });
    return () => { tw.kill(); };
  }, [on, to, duration]);
  return <span ref={el} className="n" dir="ltr">{to}</span>;
}
