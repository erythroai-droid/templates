'use client';
import { useEffect, useRef, useState } from 'react';
import { gsap, HOLD, registerZone, ScrollTrigger, useScrollReady, useStaticMode } from '@/lib/scroll';
import { useI18n } from '@/lib/i18n';
import { ASSEMBLY_SHARE, BRAND, FRAMES, framePath, locate, MODEL, pad, PARTS, SHOWCASE, STAGES, stillOf, TOTAL_G } from '@/lib/site';
import Num from './Num';
import BgType from './BgType';
import Showcase from './Showcase';

type Props = { vh?: number; covered?: boolean; onLoadProgress?: (pct: number) => void };

const BG = '#d2ced4';         // matches --stage: light studio fill behind the frames
const tier = () => (window.innerWidth <= 900 ? 768 : window.innerWidth <= 1600 ? 1280 : 1920);
const LAST = STAGES.length - 1;

function Hero() {
  const { t } = useI18n();
  return (
    <>
      <div className="hero-k">{t('hero_k')}</div>
      <h1 className="hero-h">{t('hero_h').split(' ').map((w, i) => <span key={i} style={{ '--i': i } as React.CSSProperties}>{w}</span>)}</h1>
      <div className="hero-brand" dir="ltr" aria-hidden>{BRAND}<br />{MODEL}</div>
      <p className="hero-p">{t('hero_p')}</p>
    </>
  );
}

function PartCopy({ i }: { i: number }) {
  const { t } = useI18n();
  const p = PARTS[i];
  return (
    <>
      <small>{t('part')} <span dir="ltr">{pad(p.n)} / {pad(PARTS.length)}</span></small>
      <h2>{t(`p${p.n}n`)}</h2>
      <p>{t(`p${p.n}d`)}</p>
      <dl>
        <div><dt>{t('pt_mat')}</dt><dd>{t(`m${p.n}`)}</dd></div>
        <div><dt>{t('pt_w')}</dt><dd><b dir="ltr">{p.g}</b> {t('gram')}</dd></div>
      </dl>
    </>
  );
}

function Final({ on }: { on: boolean }) {
  const { t } = useI18n();
  return (
    <>
      <small>{t('fin_k')}</small>
      <h2>{t('fin_h1')}<br /><span>{t('fin_h2')}</span></h2>
      <p>{t('fin_p')}</p>
      <ul className="fin-stats">
        <li><b><Num to={PARTS.length} on={on} /></b><span>{t('fin_s1')}</span></li>
        <li><b><Num to={TOTAL_G} on={on} /></b><span>{t('fin_s2')}</span></li>
        <li><b><Num to={60} on={on} /></b><span>{t('fin_s3')}</span></li>
      </ul>
    </>
  );
}

function AnimatedAssembly({ vh = 1000, covered, onLoadProgress }: Props) {
  const ready = useScrollReady();
  const { t } = useI18n();
  const track = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const cv = useRef<HTMLCanvasElement>(null);
  const hero = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [showProg, setShowProg] = useState(0);

  useEffect(() => {
    if (!ready) return;
    const canvas = cv.current!, trackEl = track.current!, stageEl = stage.current!, heroEl = hero.current!, ctx = canvas.getContext('2d')!;
    const dir = tier();
    const imgs: (HTMLImageElement | null)[] = new Array(FRAMES).fill(null);
    let cssW = 0, cssH = 0, frame = 0, drawn = -1, visible = false, started = false, gen = 0, loaded = 0, activeIdx = 0, holding = false, showcasing = false;

    const ok = (i: number) => !!imgs[i] && imgs[i]!.naturalWidth > 0;
    const nearest = (i: number) => {
      for (let d = 0; d < FRAMES; d++) {
        if (i - d >= 0 && ok(i - d)) return i - d;
        if (i + d < FRAMES && ok(i + d)) return i + d;
      }
      return -1;
    };
    const draw = (i: number) => {
      const j = nearest(Math.max(0, Math.min(FRAMES - 1, i)));
      if (j < 0) return;
      const im = imgs[j]!;
      const sx = cssW / im.naturalWidth, sy = cssH / im.naturalHeight;
      // always cover the stage — letterboxing looked like white side gutters and clipped overlays
      const s = cssW / cssH >= 1.1 ? Math.max(sx, sy) : Math.min(sx, sy);
      const dw = im.naturalWidth * s, dh = im.naturalHeight * s;
      ctx.fillStyle = BG; ctx.fillRect(0, 0, cssW, cssH);
      ctx.drawImage(im, (cssW - dw) / 2, (cssH - dh) / 2, dw, dh);
      drawn = j === i ? i : -1;   // keep retrying until the exact frame has arrived
    };
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cssW = canvas.clientWidth; cssH = canvas.clientHeight;
      canvas.width = Math.round(cssW * dpr); canvas.height = Math.round(cssH * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingQuality = 'high';
      drawn = -1;
    };

    // ---- loading: start when the section is within one screen, free the decoded bitmaps when it is far away ----
    const load = () => {
      if (started) return;
      started = true; loaded = 0;
      const g = ++gen;
      for (let i = 0; i < FRAMES; i++) {
        const im = new Image();
        im.decoding = 'async';
        const fin = () => { loaded++; if (g === 1) onLoadProgress?.(Math.round((loaded / FRAMES) * 100)); };   // preloader reflects the first load only
        im.onload = () => { if (g === gen) imgs[i] = im; fin(); };
        im.onerror = fin;                      // a broken frame must not block the page
        im.src = framePath(dir, i);
      }
    };
    const unload = () => { if (!started) return; started = false; gen++; imgs.fill(null); drawn = -1; };

    // ---- GSAP: pin the stage for the whole track, scrub the stages over the scrub length ----
    const scrubLen = () => trackEl.offsetHeight - (covered ? 2 + HOLD / 100 : 1) * window.innerHeight;
    const pin = ScrollTrigger.create({ trigger: trackEl, start: 'top top', end: 'bottom bottom', pin: stageEl, pinSpacing: false });
    const heroOut = STAGES[0].w / STAGES.reduce((s, x) => s + x.w, 0);
    const scrub = ScrollTrigger.create({
      trigger: trackEl, start: 'top top', end: () => `+=${Math.max(1, scrubLen())}`, invalidateOnRefresh: true,
      onUpdate: (self) => {
        const p = self.progress;
        stageEl.style.setProperty('--p', String(Math.round(p * 1000) / 1000));
        if (p < ASSEMBLY_SHARE) {
          const at = locate(p / ASSEMBLY_SHARE);
          frame = at.frame;
          if (at.stage !== activeIdx) { activeIdx = at.stage; setActive(at.stage); }
          if (showcasing) { showcasing = false; stageEl.classList.remove('showcasing'); drawn = -1; }
          setShowProg(0);
          const h = Math.min(1, (p / ASSEMBLY_SHARE) / (heroOut * 0.9));
          // headline leaves the top fully; fade only in the last third so it doesn't dissolve into the stage wash
          const head = heroEl.querySelector('.hero-h') as HTMLElement | null;
          const lift = (head?.offsetTop ?? 0) + (head?.offsetHeight ?? 180) + 48;
          const fade = h < 0.65 ? 1 : 1 - (h - 0.65) / 0.35;
          gsap.set(heroEl, { autoAlpha: fade, y: -h * lift });
        } else {
          frame = FRAMES - 1;
          if (activeIdx !== LAST) { activeIdx = LAST; setActive(LAST); }
          if (!showcasing) { showcasing = true; stageEl.classList.add('showcasing'); drawn = -1; }
          setShowProg(Math.min(1, (p - ASSEMBLY_SHARE) / (1 - ASSEMBLY_SHARE)));
          gsap.set(heroEl, { autoAlpha: 0, y: -((heroEl.querySelector('.hero-h') as HTMLElement | null)?.offsetHeight ?? 180) - 200 });
        }
        if (p >= 0.999) holding = false;
      },
    });
    // magnet free zone: scrub + hold until the next block starts to cover this one
    const unreg = registerZone({ a: () => scrub.start, b: () => (covered ? pin.end - window.innerHeight : scrub.end) });

    // ---- "hold to assemble": while the pointer is held on the stage, the page scrolls itself (the smoother eases it) ----
    const down = (e: PointerEvent) => {
      if (e.button !== 0 || (e.target as HTMLElement).closest('a,button,input,textarea')) return;
      holding = true; stageEl.classList.add('holding');
    };
    const up = () => { holding = false; stageEl.classList.remove('holding'); };
    stageEl.addEventListener('pointerdown', down);
    window.addEventListener('pointerup', up);
    window.addEventListener('blur', up);

    const tick = () => {
      if (holding) {
        const y = Math.min(scrub.end, window.scrollY + window.innerHeight * 0.012 * gsap.ticker.deltaRatio());
        if (y > window.scrollY) window.scrollTo(0, y); else up();
      }
      if (!visible) return;
      const i = Math.round(frame);
      if (i !== drawn) draw(i);
    };
    gsap.ticker.add(tick);

    resize();
    const near = new IntersectionObserver((e) => { if (e[0].isIntersecting) load(); else unload(); }, { rootMargin: '100% 0px 100% 0px' });
    const vis = new IntersectionObserver((e) => { visible = e[0].isIntersecting; if (visible) drawn = -1; });
    near.observe(trackEl); vis.observe(trackEl);
    load();                                    // first screen: always load at once (the preloader waits for it)
    const onResize = () => resize();
    window.addEventListener('resize', onResize);
    return () => {
      gsap.ticker.remove(tick); near.disconnect(); vis.disconnect(); pin.kill(); scrub.kill(); unreg();
      stageEl.removeEventListener('pointerdown', down); window.removeEventListener('pointerup', up); window.removeEventListener('blur', up);
      window.removeEventListener('resize', onResize);
      gsap.set(heroEl, { clearProps: 'opacity,visibility,transform' });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const partIdx = active - 1;                 // -1 on the hero, PARTS.length on the final stage
  const inShowcase = showProg > 0.02;
  const inParts = !inShowcase && active >= 1 && active <= PARTS.length;
  const showFin = !inShowcase && active === LAST;

  return (
    <section ref={track} id="top" className="asm" style={{ height: `calc(var(--vh) * ${(vh + (covered ? 100 + HOLD : 0)) / 100})` }} data-slide="seq">
      <div ref={stage} className="seq-stage asm-stage" data-cursor="hold">
        <canvas ref={cv} className="seq-canvas" />
        <div className="asm-shade" />
        <BgType />
        <Showcase prog={showProg} on={inShowcase} />

        <div ref={hero} className="hero"><Hero /></div>
        <div className={`hero-scroll ${active === 0 && !inShowcase ? 'on' : ''}`}><i />{t('scroll')}</div>

        <ol className={`parts-list ${inParts ? 'on' : ''}`} aria-label={t('parts_label')}>
          {PARTS.map((p, i) => (
            <li key={p.n} className={i === partIdx ? 'on' : i < partIdx ? 'done' : ''}>
              <i dir="ltr">{pad(p.n)}</i><span>{t(`p${p.n}n`)}</span>
            </li>
          ))}
        </ol>
        {PARTS.map((p, i) => <div key={p.n} className={`part-card ${i === partIdx ? 'on' : ''}`} aria-hidden={i !== partIdx}><PartCopy i={i} /></div>)}

        <div className={`fin ${showFin ? 'on' : ''}`} aria-hidden={!showFin}><Final on={showFin} /></div>

        <div className={`asm-hud ${inShowcase ? 'dim' : ''}`} aria-label={t('hud_label')} dir="ltr">
          <span>{pad(Math.max(0, Math.min(PARTS.length, active)))}</span>
          <i className="asm-bar"><u /></i>
          <span>{pad(PARTS.length)}</span>
        </div>
      </div>
    </section>
  );
}

// Static page (phones, reduced motion): the hero over the assembled watch, then one still per part with its copy. No canvas, no scrubbing.
function StaticAssembly() {
  const { t } = useI18n();
  return (
    <section id="top" className="asm-static" data-slide="seq">
      <div className="st-hero">
        <img src={framePath(1280, FRAMES - 1)} alt="" width={1280} height={720} />
        <BgType />
        <div className="hero"><Hero /></div>
      </div>
      {PARTS.map((p, i) => (
        <article key={p.n} className="st-card">
          <div className="st-img"><img src={framePath(1280, stillOf(i + 1))} alt="" loading="lazy" width={1280} height={720} /></div>
          <div className="part-card on"><PartCopy i={i} /></div>
        </article>
      ))}
      <div className="st-fin fin on"><Final on /></div>
      <div className="st-sc">
        <h2 className="st-sc-h">{t('sc_h')}</h2>
        {SHOWCASE.map((beat) => (
          <article key={beat.id} className={`st-sc-card st-sc-${beat.side}`}>
            <small>{t(`sc${beat.id}k`)}</small>
            <p>{t(`sc${beat.id}p`)}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function Assembly(props: Props) {
  const staticMode = useStaticMode();
  return staticMode ? <StaticAssembly /> : <AnimatedAssembly {...props} />;
}
