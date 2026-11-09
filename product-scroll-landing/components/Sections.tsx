'use client';
import { useEffect, useRef, useState } from 'react';
import Reveal from './Reveal';
import CountUp from './CountUp';
import VideoBg from './VideoBg';
import { OPEN_CONTACT } from './Header';
import { usePinnedBlock } from '@/lib/pin';
import { useI18n } from '@/lib/i18n';
import { gsap, prefersReducedMotion, ScrollTrigger, useScrollReady } from '@/lib/scroll';
import { BRAND, DESIGN_SLIDES, framePath, MODEL, pad, PARTS, TOTAL_G } from '@/lib/site';

/** 01 — movement: pinned until its group ends, the rest of the page rides up over it. */
export function Movement() {
  const { t } = useI18n();
  const el = useRef<HTMLElement>(null);
  usePinnedBlock(el, '.tb-in');
  return (
    <section ref={el} id="movement" className="tb has-vbg" data-slide="tb">
      <VideoBg src="/video/particle-wave.mp4" />
      <div className="tb-in">
        <Reveal from="left"><small>{t('mv_k')}</small></Reveal>
        <div>
          <Reveal delay={80}><h2>{t('mv_h1')}<br /><span>{t('mv_h2')}</span></h2></Reveal>
          <div className="feats">
            <Reveal delay={160} from="up"><h3>{t('mv_f1h')}</h3><p>{t('mv_f1p')}</p></Reveal>
            <Reveal delay={240} from="up"><h3>{t('mv_f2h')}</h3><p>{t('mv_f2p')}</p></Reveal>
          </div>
          <Reveal delay={320} from="up">
            <div className="tb-stats">
              <div><b><CountUp to={28800} /></b><span>{t('mv_s1')}</span></div>
              <div><b><CountUp to={60} /></b><span>{t('mv_s2')}</span></div>
              <div><b><CountUp to={100} /></b><span>{t('mv_s3')}</span></div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

/** Giant model letters sliding sideways with the scroll (the reference's running "FS60P" letters). */
export function Marquee() {
  const ready = useScrollReady();
  const row = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!ready) return;
    const node = row.current!;
    const tw = gsap.fromTo(node, { xPercent: 0 }, {
      xPercent: -50, ease: 'none',
      scrollTrigger: { trigger: node.parentElement, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    return () => { tw.scrollTrigger?.kill(); tw.kill(); gsap.set(node, { clearProps: 'transform' }); };
  }, [ready]);
  const word = `${BRAND}${MODEL}`;
  return (
    <div className="marq" aria-hidden dir="ltr">
      {/* invisible sizer keeps vertical space; the animated row is absolute so it cannot widen the page */}
      <div className="marq-sizer"><span>{word}</span></div>
      <div ref={row} className="marq-row">
        {Array.from({ length: 4 }, (_, i) => <span key={i} className={i % 2 ? 'o' : ''}>{word}</span>)}
      </div>
    </div>
  );
}

/** 02 — design: full-screen pinned slider with enter + per-slide motion. */
export function Design() {
  const { t, dir } = useI18n();
  const ready = useScrollReady();
  const el = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const n = DESIGN_SLIDES.length;
  usePinnedBlock(el, '.ds-in');

  const go = (next: number) => setI(((next % n) + n) % n);

  useEffect(() => {
    const node = track.current;
    if (!node) return;
    let x0 = 0, dx = 0, dragging = false;
    const down = (e: PointerEvent) => {
      if (e.button !== 0) return;
      dragging = true; x0 = e.clientX; dx = 0;
      node.setPointerCapture(e.pointerId);
      node.classList.add('dragging');
    };
    const move = (e: PointerEvent) => { if (!dragging) return; dx = e.clientX - x0; node.style.setProperty('--drag', `${dx}px`); };
    const up = () => {
      if (!dragging) return;
      dragging = false; node.classList.remove('dragging'); node.style.removeProperty('--drag');
      const step = dir === 'rtl' ? -dx : dx;
      if (Math.abs(step) > 56) go(i + (step < 0 ? 1 : -1));
    };
    node.addEventListener('pointerdown', down);
    node.addEventListener('pointermove', move);
    node.addEventListener('pointerup', up);
    node.addEventListener('pointercancel', up);
    return () => {
      node.removeEventListener('pointerdown', down);
      node.removeEventListener('pointermove', move);
      node.removeEventListener('pointerup', up);
      node.removeEventListener('pointercancel', up);
    };
  }, [i, dir]);

  // slow parallax scale while the section is on screen
  useEffect(() => {
    if (!ready) return;
    const section = el.current;
    if (!section) return;
    const tw = gsap.fromTo(section.querySelectorAll('.ds-slide-img img'), { scale: 1.12 }, {
      scale: 1, ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom top', scrub: true },
    });
    return () => { tw.scrollTrigger?.kill(); tw.kill(); };
  }, [ready]);

  // on slide change: image clip + copy rise
  useEffect(() => {
    if (prefersReducedMotion()) return;
    const section = el.current;
    if (!section) return;
    const slide = section.querySelectorAll('.ds-slide')[i] as HTMLElement | undefined;
    if (!slide) return;
    const img = slide.querySelector('.ds-slide-img');
    const copy = slide.querySelectorAll('.ds-slide-copy > *');
    const ctx = gsap.context(() => {
      gsap.fromTo(img, { clipPath: 'inset(8% 6% 8% 6%)', scale: 1.04 }, {
        clipPath: 'inset(0% 0% 0% 0%)', scale: 1, duration: 0.85, ease: 'power3.out',
      });
      gsap.fromTo(copy, { autoAlpha: 0, y: 22 }, {
        autoAlpha: 1, y: 0, duration: 0.7, stagger: 0.08, delay: 0.12, ease: 'power3.out',
      });
    }, section);
    return () => ctx.revert();
  }, [i]);

  return (
    <section ref={el} id="design" className="ds has-vbg" data-slide="tb">
      <VideoBg src="/video/fluid-lines.mp4" />
      <div className="ds-in">
        <div className="ds-head">
          <Reveal from="left"><small>{t('ds_k')}</small></Reveal>
          <Reveal delay={80}><h2>{t('ds_h1')}<br /><span>{t('ds_h2')}</span></h2></Reveal>
          <Reveal delay={140}><p className="ds-hint muted">{t('ds_hint')}</p></Reveal>
        </div>

        <Reveal delay={180} from="clip" className="ds-stage-wrap">
          <div className="ds-stage" ref={track} data-cursor="link">
            <div className="ds-track" dir="ltr" style={{ transform: `translateX(calc(${-i} * 100% + var(--drag, 0px)))` }}>
              {DESIGN_SLIDES.map((s) => (
                <article key={s.n} className={`ds-slide ${s.n - 1 === i ? 'on' : ''}`} aria-hidden={s.n - 1 !== i}>
                  <div className="ds-slide-img">
                    <picture>
                      <source media="(max-width: 900px)" srcSet={framePath(1280, s.frame)} />
                      <img src={framePath(1920, s.frame)} alt={t(`ds_s${s.n}h`)} width={1920} height={1080} draggable={false} />
                    </picture>
                  </div>
                  <div className="ds-slide-copy">
                    <small dir="ltr">{pad(s.n)} / {pad(n)}</small>
                    <h3>{t(`ds_s${s.n}h`)}</h3>
                    <p>{t(`ds_s${s.n}p`)}</p>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </Reveal>

        <Reveal delay={260} from="up">
          <div className="ds-nav">
            <button type="button" className="ds-arrow" onClick={() => go(i - 1)} aria-label={t('ds_prev')}>
              <span className="arr">←</span>
            </button>
            <div className="ds-dots" role="tablist" aria-label={t('ds_k')}>
              {DESIGN_SLIDES.map((s, k) => (
                <button
                  key={s.n}
                  type="button"
                  role="tab"
                  aria-selected={k === i}
                  aria-label={`${pad(s.n)} — ${t(`ds_s${s.n}h`)}`}
                  className={k === i ? 'on' : ''}
                  onClick={() => setI(k)}
                />
              ))}
            </div>
            <button type="button" className="ds-arrow" onClick={() => go(i + 1)} aria-label={t('ds_next')}>
              <span className="arr">→</span>
            </button>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/** 03 — specification: full-screen pinned table of parts. */
export function PartsTable() {
  const { t } = useI18n();
  const el = useRef<HTMLElement>(null);
  usePinnedBlock(el, '.ptab-in');
  return (
    <section ref={el} id="parts" className="ptab rise has-vbg" data-slide="blk">
      <VideoBg src="/video/dotted-grid.mp4" />
      <div className="ptab-in">
        <div className="ptab-head">
          <Reveal from="left"><small>{t('pt_k')}</small></Reveal>
          <Reveal delay={80}><h2>{t('pt_h1')}<br /><span>{t('pt_h2')}</span></h2></Reveal>
        </div>
        <div className="ptab-t" role="table" aria-label={t('parts_label')}>
          <Reveal delay={100} from="up">
            <div className="ptab-r th" role="row">
              <span role="columnheader">{t('pt_no')}</span><span role="columnheader">{t('pt_part')}</span>
              <span role="columnheader">{t('pt_mat')}</span><span role="columnheader">{t('pt_w')}</span>
            </div>
          </Reveal>
          {PARTS.map((p, i) => (
            <Reveal key={p.n} delay={140 + 55 * i} from={i % 2 ? 'right' : 'left'}>
              <div className="ptab-r" role="row">
                <span role="cell" dir="ltr">{pad(p.n)}</span>
                <span role="cell">{t(`p${p.n}n`)}</span>
                <span role="cell">{t(`m${p.n}`)}</span>
                <span role="cell"><b dir="ltr">{p.g}</b> {t('gram')}</span>
              </div>
            </Reveal>
          ))}
          <Reveal delay={140 + 55 * PARTS.length} from="up">
            <div className="ptab-r tot" role="row">
              <span role="cell" />
              <span role="cell">{t('pt_total')}</span>
              <span role="cell" />
              <span role="cell"><CountUp to={TOTAL_G} /> {t('gram')}</span>
            </div>
          </Reveal>
        </div>
        <Reveal delay={200}><p className="ptab-note">{t('pt_note')}</p></Reveal>
      </div>
    </section>
  );
}

export function Footer() {
  const { t } = useI18n();
  const ready = useScrollReady();
  const title = useRef<HTMLDivElement>(null);

  // size brand+model so one line exactly fills the viewport width
  useEffect(() => {
    const node = title.current;
    if (!node) return;
    const fit = () => {
      node.style.fontSize = '100px';
      node.style.width = 'max-content';
      const w = node.getBoundingClientRect().width || 1;
      node.style.width = '';
      node.style.fontSize = `${(window.innerWidth / w) * 100}px`;
    };
    fit();
    document.fonts?.ready.then(fit);
    const ro = new ResizeObserver(fit);
    ro.observe(document.documentElement);
    window.addEventListener('resize', fit);
    return () => { ro.disconnect(); window.removeEventListener('resize', fit); };
  }, []);

  // mouse parallax — whole brand+model drifts as one unit (inner track; outer box stays put)
  useEffect(() => {
    const node = title.current;
    if (!node || prefersReducedMotion()) return;
    const track = node.querySelector('.ftr-title-track') as HTMLElement | null;
    if (!track) return;
    let mx = 0, my = 0, tx = 0, ty = 0, raf = 0;
    const onMove = (e: PointerEvent) => {
      const r = node.getBoundingClientRect();
      if (e.clientY < r.top - 80 || e.clientY > r.bottom + 80) { mx = 0; my = 0; return; }
      mx = ((e.clientX - r.left) / Math.max(1, r.width) - 0.5) * 2;
      my = ((e.clientY - r.top) / Math.max(1, r.height) - 0.5) * 2;
    };
    const tick = () => {
      tx += (mx - tx) * 0.06;
      ty += (my - ty) * 0.06;
      track.style.transform = `translate3d(${(tx * 14).toFixed(2)}px,${(ty * 10).toFixed(2)}px,0)`;
      raf = requestAnimationFrame(tick);
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onMove);
      track.style.transform = '';
    };
  }, []);

  useEffect(() => {
    if (!ready || prefersReducedMotion()) return;
    const node = title.current;
    if (!node) return;
    // animate opacity only — a y transform on the box made the whole block drift
    const tw = gsap.fromTo(node, { autoAlpha: 0 }, {
      autoAlpha: 1, ease: 'none',
      scrollTrigger: { trigger: node.closest('footer'), start: 'top 75%', end: 'top 30%', scrub: true },
    });
    return () => { tw.scrollTrigger?.kill(); tw.kill(); gsap.set(node, { clearProps: 'opacity,visibility' }); };
  }, [ready]);

  return (
    <footer id="contact" className="ftr rise" data-slide="blk">
      <div ref={title} className="ftr-title" dir="ltr" aria-hidden>
        <span className="ftr-title-track">
          <span className="ftr-brand">{BRAND}</span><span className="ftr-model">{MODEL}</span>
        </span>
      </div>
      <div className="ftr-grid">
        <Reveal from="up">
          <div>
            <h2>{t('f_h1')}<br /><span>{t('f_h2')}</span></h2>
            <p className="muted">{t('f_p')}</p>
            <button className="btn solid" onClick={() => window.dispatchEvent(new Event(OPEN_CONTACT))}>{t('reserve')} <span className="arr">→</span></button>
          </div>
        </Reveal>
        <Reveal delay={100} from="up">
          <div>
            <h3>{t('f_contact')}</h3>
            <a href="mailto:hello@example.com" dir="ltr">hello@example.com</a>
            <a href="tel:+10000000000" dir="ltr">+1 000 000 00 00</a>
          </div>
        </Reveal>
        <Reveal delay={180} from="up">
          <div>
            <h3>{t('f_social')}</h3>
            <a href="#" onClick={(e) => e.preventDefault()}>Instagram</a>
            <a href="#" onClick={(e) => e.preventDefault()}>YouTube</a>
          </div>
        </Reveal>
      </div>
      <Reveal delay={240}><div className="ftr-bot"><span>{t('f_rights')}</span><span dir="ltr">{BRAND} {MODEL} · 146GR</span></div></Reveal>
    </footer>
  );
}

/** Refresh the triggers once images below the fold have their size. */
export function useLateRefresh() {
  const ready = useScrollReady();
  useEffect(() => {
    if (!ready) return;
    const id = setTimeout(() => ScrollTrigger.refresh(), 600);
    return () => clearTimeout(id);
  }, [ready]);
}
