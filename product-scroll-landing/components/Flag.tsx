import { Lang } from '@/lib/i18n';

// Inline SVG flags (emoji flags do not render on Windows). 3:2, rounded.
export default function Flag({ code, size = 22 }: { code: Lang; size?: number }) {
  const w = size, h = Math.round(size * 2 / 3);
  const common = { width: w, height: h, viewBox: '0 0 30 20', 'aria-hidden': true, className: 'flag' } as const;
  if (code === 'ru') return (
    <svg {...common}><rect width="30" height="20" fill="#fff" /><rect y="6.67" width="30" height="6.67" fill="#0039a6" /><rect y="13.33" width="30" height="6.67" fill="#d52b1e" /></svg>
  );
  if (code === 'he') return (
    <svg {...common}>
      <rect width="30" height="20" fill="#fff" />
      <rect y="2" width="30" height="3" fill="#0038b8" /><rect y="15" width="30" height="3" fill="#0038b8" />
      <g fill="none" stroke="#0038b8" strokeWidth="1.1"><path d="M15 6.2l3.5 6.1h-7z" /><path d="M15 13.2l-3.5-6.1h7z" /></g>
    </svg>
  );
  if (code === 'ar') return (  // Arabic: generic green pennant with a white crescent (no single country)
    <svg {...common}>
      <rect width="30" height="20" fill="#006c35" />
      <path d="M17.5 5.2a5 5 0 1 0 0 9.6 4 4 0 1 1 0-9.6z" fill="#fff" />
    </svg>
  );
  return (  // en: United Kingdom
    <svg {...common}>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0l30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0l30 20M30 0L0 20" stroke="#c8102e" strokeWidth="1.6" />
      <path d="M15 0v20M0 10h30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0v20M0 10h30" stroke="#c8102e" strokeWidth="3.4" />
    </svg>
  );
}
