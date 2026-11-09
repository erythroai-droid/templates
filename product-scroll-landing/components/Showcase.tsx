'use client';
import { useI18n } from '@/lib/i18n';
import { BRAND, MODEL, SHOWCASE } from '@/lib/site';

/** Post-assembly overlays: giant stacked headline behind/around the watch + L/R feature cards (thewatch.60fps.fr). */
export default function Showcase({ prog, on }: { prog: number; on: boolean }) {
  const { t } = useI18n();
  const words = t('sc_h').split(/\s+/).filter(Boolean);
  const n = SHOWCASE.length;
  // which card is in focus; slight overlap so the previous fades as the next arrives
  const idx = Math.min(n - 1, Math.max(0, Math.floor(prog * n)));
  const local = prog * n - idx;

  return (
    <div className={`sc ${on ? 'on' : ''}`} aria-hidden={!on}>
      <div className="sc-brand" dir="ltr">{BRAND}<span>{MODEL}</span></div>

      <div className="sc-big" style={{ '--sc': String(Math.round(prog * 1000) / 1000) } as React.CSSProperties}>
        {words.map((w, i) => {
          const appear = Math.min(1, Math.max(0, (prog - i * 0.08) / 0.18));
          const tone = i % 2 ? 'dim' : 'lit';
          return (
            <span key={i} className={`sc-w ${tone}`} style={{ opacity: appear, transform: appear < 1 ? `translateY(${(1 - appear) * 18}px)` : 'none' }}>
              {w}
            </span>
          );
        })}
      </div>

      {SHOWCASE.map((beat, i) => {
        const active = on && i === idx;
        const next = on && i === idx - 1 && local < 0.35;
        const vis = active || next;
        const opacity = active ? Math.min(1, local < 0.15 ? local / 0.15 : 1 - Math.max(0, local - 0.75) / 0.25)
          : next ? Math.max(0, 1 - local / 0.35) : 0;
        return (
          <aside
            key={beat.id}
            className={`sc-card sc-${beat.side} ${vis ? 'on' : ''}`}
            style={{ opacity }}
            aria-hidden={!active}
          >
            <small>{t(`sc${beat.id}k`)}</small>
            <p>{t(`sc${beat.id}p`)}</p>
          </aside>
        );
      })}
    </div>
  );
}
