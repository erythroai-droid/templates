'use client';
import { useEffect, useState } from 'react';
import Header from '@/components/Header';
import Preloader from '@/components/Preloader';
import Cursor from '@/components/Cursor';
import ScrollTop from '@/components/ScrollTop';
import AiChat from '@/components/AiChat';
import DemoNotice from '@/components/DemoNotice';
import Assembly from '@/components/Assembly';
import { Design, Footer, Marquee, Movement, PartsTable, useLateRefresh } from '@/components/Sections';
import { SmoothScroll, initMagnet, registerZone, ScrollTrigger, useScrollReady, useStaticMode } from '@/lib/scroll';

export default function Page() {
  const [pct, setPct] = useState(0);
  const staticMode = useStaticMode();
  // restored scroll position far from the hero, or the static page (no frame sequence): don't hold the page behind the preloader
  useEffect(() => { if (window.scrollY > 300 || staticMode) setPct(100); }, [staticMode]);
  return (
    <>
      <Preloader pct={pct} />
      <Header />
      <ScrollTop />
      <AiChat />
      <DemoNotice />
      <Cursor />
      <SmoothScroll><Content onLoadProgress={(v) => setPct((p) => Math.max(p, v))} /></SmoothScroll>
    </>
  );
}

function Content({ onLoadProgress }: { onLoadProgress: (v: number) => void }) {
  useLateRefresh();
  const ready = useScrollReady();

  // magnet snap between full-screen blocks (same as rosso-garage)
  useEffect(() => {
    if (!ready) return;
    const cleanups = ['#contact'].map((sel) => {
      const el = document.querySelector<HTMLElement>(sel);
      if (!el) return () => {};
      const st = ScrollTrigger.create({ trigger: el, start: 'top top', invalidateOnRefresh: true });
      const unreg = registerZone({
        a: () => st.start,
        b: () => Math.min(ScrollTrigger.maxScroll(window), st.start + Math.max(0, el.offsetHeight - window.innerHeight)),
      });
      return () => { st.kill(); unreg(); };
    });
    const magnet = initMagnet();
    return () => { magnet(); cleanups.forEach((c) => c()); };
  }, [ready]);

  return (
    <main>
      {/* watch assembles + post-assembly showcase while pinned */}
      <Assembly vh={1600} covered onLoadProgress={onLoadProgress} />

      {/* 01 movement fills the screen, then marquee rides up over it */}
      <div className="grp over" style={{ zIndex: 1 }}>
        <Movement />
        <div className="rise after">
          <Marquee />
        </div>
      </div>

      {/* 02 design → 03 parts: each is a full-screen pinned magnet block; footer free-scrolls at the end */}
      <div className="grp over" style={{ zIndex: 2 }}>
        <Design />
        <PartsTable />
        <Footer />
      </div>
    </main>
  );
}
