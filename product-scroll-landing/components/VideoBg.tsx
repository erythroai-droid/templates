'use client';
import { useEffect, useRef } from 'react';
import { prefersReducedMotion, useStaticMode } from '@/lib/scroll';

type Src = { src: string; type?: string };

/**
 * Full-bleed muted looping video behind a content section.
 * Plays only while the host is near the viewport; pauses off-screen and under reduced motion.
 * Static mode (phones) drops the layer, unless `staticSrc` gives a light mobile cut to play instead.
 */
export default function VideoBg({ src, sources, staticSrc, className = '' }: { src?: string; sources?: Src[]; staticSrc?: string; className?: string }) {
  const staticMode = useStaticMode();
  const mobile = staticMode && !!staticSrc && !prefersReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const list = mobile ? [{ src: staticSrc! }] : sources ?? (src ? [{ src }] : []);

  useEffect(() => {
    const node = video.current;
    const host = wrap.current?.parentElement;
    if (!node || !host || !list.length) return;
    if ((staticMode && !mobile) || prefersReducedMotion()) {
      node.removeAttribute('src');
      node.load();
      return;
    }

    let primed = false;
    const play = () => {
      if (!primed) { node.load(); primed = true; }
      node.play().catch(() => {});
    };
    const pause = () => { node.pause(); };

    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) play(); else pause(); },
      { rootMargin: '50% 0px', threshold: 0.02 },
    );
    io.observe(host);

    const onVis = () => { if (document.hidden) pause(); else if (host.getBoundingClientRect().bottom > 0 && host.getBoundingClientRect().top < window.innerHeight) play(); };
    document.addEventListener('visibilitychange', onVis);

    return () => { io.disconnect(); document.removeEventListener('visibilitychange', onVis); pause(); };
  }, [staticMode, mobile, list.length]);

  if (!list.length || (staticMode && !mobile)) return null;

  return (
    <div ref={wrap} className={mobile ? 'vbg vbg-m' : `vbg ${className}`} aria-hidden>
      <video
        key={list[0].src}
        ref={video}
        className="vbg-video"
        muted
        loop
        playsInline
        preload="none"
        disablePictureInPicture
      >
        {list.map((s) => (
          <source key={s.src} src={s.src} type={s.type ?? (s.src.endsWith('.mov') ? 'video/quicktime' : 'video/mp4')} />
        ))}
      </video>
      <div className="vbg-veil" />
    </div>
  );
}
