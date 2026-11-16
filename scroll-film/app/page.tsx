'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Preloader from '@/components/Preloader';
import Cursor from '@/components/Cursor';
import ScrollTop from '@/components/ScrollTop';
import AiChat from '@/components/AiChat';
import StudioBar from '@/components/StudioBar';
import Film from '@/components/Film';
import Metrics from '@/components/Metrics';
import { Contact, Craft, Cuts, Experience, Feast, Gallery, Hero, Rails } from '@/components/Scenes';
import { gsap, prefersReducedMotion, ScrollSmoother, SmoothScroll, ScrollTrigger, useScrollReady } from '@/lib/scroll';

/**
 * Layout of the reference: one film fixed behind the page, scrubbed by the scroll; the scenes scroll over it in normal flow
 * and hand over to each other; the contact block finally slides over the last frame.
 */
export default function Page() {
  const [pct, setPct] = useState(0);
  const [active, setActive] = useState(0);
  // no blocking preloader where ad traffic lands (phones / tablets) or on a restored scroll: the first frame paints at once,
  // the rest of the film streams in behind the page. Desktop keeps the short preloader (a coarse pass of the frames).
  useEffect(() => { if (window.scrollY > 300 || window.matchMedia('(max-width: 900px)').matches) setPct(100); }, []);
  return (
    <>
      <Preloader pct={pct} />
      <Metrics />
      <Film onLoadProgress={(v) => setPct((p) => Math.max(p, v))} onScene={setActive} />
      <Header />
      <Rails active={active} />
      <ScrollTop />
      <AiChat />
      <StudioBar />
      <Cursor />
      <SmoothScroll><Content active={active} /></SmoothScroll>
    </>
  );
}

/**
 * Scroll magnet (desktop: the smooth-scroll path, i.e. mouse wheel / trackpad). When the scrolling stops, the page glides
 * to the nearest stop so a block's content ends up centred and never has to be nudged by hand:
 * hero top · centre of each side scene · the finale copy · the gallery with every print on the table · contact top · page end.
 * A small nudge away from a stop carries on to the next stop in that direction; it never jumps past a stop.
 */
function useMagnet(ready: boolean) {
  useEffect(() => {
    if (!ready || prefersReducedMotion()) return;
    const sm = ScrollSmoother.get();
    if (!sm) return;
    const vh = () => window.innerHeight;
    const at = (sel: string, pos: string) => {
      const el = document.querySelector<HTMLElement>(sel);
      return el ? sm.offset(el, pos) : null;
    };
    const stops = () => {
      const max = ScrollTrigger.maxScroll(window);
      const gal = document.getElementById('gallery');
      const galBox = gal?.parentElement?.classList.contains('pin-spacer') ? gal.parentElement : gal;
      const pts = [
        0,
        at('#craft .scn-in', 'center center'),
        at('#cuts .scn-in', 'center center'),
        at('#feast .scn-in', 'center center'),
        at('#experience .scn-in', 'bottom 88%'),                       // the finale sits low over the plate, as designed
        galBox ? sm.offset(galBox, 'top top') + vh() * 1.4 : null,     // end of the deal-in (pin length '+=140%')
        at('#contact', 'top top'),
        max,
      ];
      return [...new Set(pts.filter((p): p is number => p !== null).map((p) => Math.round(Math.min(max, Math.max(0, p)))))].sort((a, b) => a - b);
    };
    const target = (y: number, dir: number) => {
      const pts = stops();
      let i = 0;
      for (let k = 1; k < pts.length; k++) if (Math.abs(pts[k] - y) < Math.abs(pts[i] - y)) i = k;
      let t = pts[i];
      // nudged off a stop in the scroll direction: carry on to the next stop instead of springing back
      const nudge = vh() * 0.12;
      if (dir > 0 && t < y - nudge && i + 1 < pts.length) t = pts[i + 1];
      if (dir < 0 && t > y + nudge && i > 0) t = pts[i - 1];
      return t;
    };

    // Own settle loop (GSAP's built-in snap stopped reacting after its first pull): the wheel gives the direction,
    // 150 ms without wheel or scroll means "stopped", then the native scroll glides to the stop (the smoother eases it on top).
    // Any new wheel / key / touch / mouse press during the glide hands control straight back.
    let dir = 0, prevY = window.scrollY, timer = 0, gliding = false;
    let tw: gsap.core.Tween | null = null;
    const stop = () => { tw?.kill(); tw = null; gliding = false; };
    const settle = () => {
      if (sm.paused() || document.querySelector('.lbx, .modal.open')) return;   // viewer / modal open: leave the page alone
      const y = window.scrollY, t = target(y, dir);
      if (Math.abs(t - y) < 2) return;
      const pos = { y };
      gliding = true;
      tw = gsap.to(pos, {
        y: t,
        duration: Math.min(1.1, Math.max(0.35, (Math.abs(t - y) / vh()) * 0.55)),
        ease: 'power2.inOut',
        onUpdate: () => window.scrollTo(0, pos.y),
        onComplete: () => { gliding = false; tw = null; prevY = window.scrollY; dir = 0; },
      });
    };
    const arm = () => { window.clearTimeout(timer); timer = window.setTimeout(settle, 150); };
    const onWheel = (e: WheelEvent) => { if (gliding) stop(); if (e.deltaY) dir = Math.sign(e.deltaY); arm(); };
    const onScroll = () => {
      if (gliding) return;                       // our own glide moves the page: not a user stop
      const y = window.scrollY;
      if (y !== prevY) dir = Math.sign(y - prevY) || dir;
      prevY = y;
      arm();
    };
    const onInput = () => { if (gliding) stop(); };
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('scroll', onScroll, { passive: true });
    ['keydown', 'mousedown', 'touchstart'].forEach((e) => window.addEventListener(e, onInput, { passive: true }));
    return () => {
      stop(); window.clearTimeout(timer);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('scroll', onScroll);
      ['keydown', 'mousedown', 'touchstart'].forEach((e) => window.removeEventListener(e, onInput));
    };
  }, [ready]);
}

function Content({ active }: { active: number }) {
  const ready = useScrollReady();
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => ScrollTrigger.refresh(), 600);   // fonts / late layout
    return () => clearTimeout(id);
  }, [ready]);
  useMagnet(ready);
  return (
    <main>
      <Hero />
      <Craft />
      <Cuts />
      <Feast />
      <Experience active={active} />
      <Gallery />
      <Contact />
    </main>
  );
}
