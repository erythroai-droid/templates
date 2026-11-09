'use client';
import { ReactNode, useEffect, useRef } from 'react';
import { gsap, prefersReducedMotion, ScrollTrigger, useScrollReady } from '@/lib/scroll';

type From = 'up' | 'left' | 'right' | 'scale' | 'clip';

/**
 * Fade/slide-in when the block (or its section) enters the viewport.
 * For pinned full-screen blocks, trigger off the parent section so the whole choreography starts together.
 */
export default function Reveal({
  children, delay = 0, className = '', from = 'up', scrub = false,
}: {
  children: ReactNode; delay?: number; className?: string; from?: From; scrub?: boolean;
}) {
  const ready = useScrollReady();
  const el = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ready) return;
    const node = el.current!;
    if (prefersReducedMotion()) { gsap.set(node, { clearProps: 'all' }); node.classList.add('in'); return; }

    const fromVars: gsap.TweenVars =
      from === 'left' ? { autoAlpha: 0, x: -36 } :
      from === 'right' ? { autoAlpha: 0, x: 36 } :
      from === 'scale' ? { autoAlpha: 0, scale: 1.06 } :
      from === 'clip' ? { autoAlpha: 0, clipPath: 'inset(12% 8% 12% 8%)', scale: 1.04 } :
      { autoAlpha: 0, y: 28 };
    const toVars: gsap.TweenVars =
      from === 'left' || from === 'right' ? { autoAlpha: 1, x: 0 } :
      from === 'scale' ? { autoAlpha: 1, scale: 1 } :
      from === 'clip' ? { autoAlpha: 1, clipPath: 'inset(0% 0% 0% 0%)', scale: 1 } :
      { autoAlpha: 1, y: 0 };

    const trigger = node.closest('section, footer, [data-slide]') ?? node;
    const delaySec = (delay / 1000) * 0.55;

    if (scrub) {
      const tw = gsap.fromTo(node, fromVars, {
        ...toVars, ease: 'none',
        scrollTrigger: { trigger, start: 'top 80%', end: 'top 35%', scrub: true },
      });
      return () => { tw.scrollTrigger?.kill(); tw.kill(); gsap.set(node, { clearProps: 'all' }); };
    }

    const tween = gsap.fromTo(node, fromVars, {
      ...toVars, duration: 0.95, delay: delaySec, ease: 'power3.out', paused: true,
      onStart: () => node.classList.add('in'),
    });
    const st = ScrollTrigger.create({
      trigger, start: 'top 88%', once: true,
      onEnter: () => tween.play(),
    });
    // if already in view (e.g. restored scroll / magnet land), play immediately
    if (st.isActive || trigger.getBoundingClientRect().top < window.innerHeight * 0.92) tween.play();

    return () => { st.kill(); tween.kill(); gsap.set(node, { clearProps: 'all' }); };
  }, [ready, delay, from, scrub]);

  return <div ref={el} className={`rv ${className}`}>{children}</div>;
}
