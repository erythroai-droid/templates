// Product + assembly-frame config in one place. Swap these for a real client model.
// With stub media (5 placeholder frames) keep FRAMES=5 and PARTS.f inside 0..FRAMES-1.
// After extract-frames.mjs, set FRAMES to the real count and retime PARTS.f from a contact sheet.

/** Set false after generating a full frame pack into public/frames/assembly. */
export const STUB_MEDIA = true;

/** Frames in public/frames/assembly/{768,1280,1920}/frame_0001..N.webp */
export const FRAMES = STUB_MEDIA ? 5 : 181;
export const FRAME_DIR = '/frames/assembly';

export const BRAND = 'ACME';
export const MODEL = 'X1';

/**
 * Parts in the order the assembly video introduces them.
 * f: frame range (0-based). g: weight (placeholder). w: optional scroll weight.
 * Texts: i18n keys p{n}n (name), p{n}d (description), m{n} (material).
 */
export const PARTS = STUB_MEDIA
  ? ([
      { n: 1, g: 16, f: [0, 1] },
      { n: 2, g: 34, f: [1, 1] },
      { n: 3, g: 14, f: [1, 2] },
      { n: 4, g: 29, f: [2, 2], w: 1.8 },
      { n: 5, g: 11, f: [2, 3] },
      { n: 6, g: 1, f: [3, 3] },
      { n: 7, g: 38, f: [3, 4] },
      { n: 8, g: 3, f: [4, 4] },
    ] as const)
  : ([
      { n: 1, g: 16, f: [10, 20] },
      { n: 2, g: 34, f: [20, 30] },
      { n: 3, g: 14, f: [30, 40] },
      { n: 4, g: 29, f: [40, 90], w: 1.8 },
      { n: 5, g: 11, f: [90, 108] },
      { n: 6, g: 1, f: [108, 119] },
      { n: 7, g: 38, f: [119, 130] },
      { n: 8, g: 3, f: [130, 141] },
    ] as const);

export const TOTAL_G = PARTS.reduce((s, p) => s + p.g, 0);

/** Post-assembly showcase cards; ids map to i18n sc{id}k / sc{id}p. */
export const SHOWCASE = [
  { id: 1, side: 'start' },
  { id: 2, side: 'end' },
  { id: 3, side: 'start' },
  { id: 4, side: 'end' },
] as const;

/** Fraction of the assembly scrub used for frames; the rest is the post-assembly showcase. */
export const ASSEMBLY_SHARE = 0.62;

/** Design slider stills (frame index + i18n keys ds_s{n}h / ds_s{n}p). */
export const DESIGN_SLIDES = STUB_MEDIA
  ? ([
      { frame: FRAMES - 1, n: 1 },
      { frame: 1, n: 2 },
      { frame: 2, n: 3 },
      { frame: 3, n: 4 },
    ] as const)
  : ([
      { frame: FRAMES - 1, n: 1 },
      { frame: 100, n: 2 },
      { frame: 70, n: 3 },
      { frame: 125, n: 4 },
    ] as const);

type Stage = { f: readonly [number, number]; w: number };

/** Scroll stages: 0 = hero, 1..N = parts, last = assembled hold. */
export const STAGES: Stage[] = STUB_MEDIA
  ? [
      { f: [0, 0], w: 1.2 },
      ...PARTS.map((p) => ({ f: p.f, w: 'w' in p ? (p as { w?: number }).w ?? 1 : 1 })),
      { f: [FRAMES - 1, FRAMES - 1], w: 2 },
    ]
  : [
      { f: [0, 10], w: 1.2 },
      ...PARTS.map((p) => ({ f: p.f, w: 'w' in p ? (p as { w?: number }).w ?? 1 : 1 })),
      { f: [141, FRAMES - 1], w: 2 },
    ];

const W = STAGES.reduce((s, x) => s + x.w, 0);

/** Scroll progress 0..1 (assembly share only) -> active stage and (fractional) frame index. */
export function locate(progress: number) {
  let x = Math.max(0, Math.min(1, progress)) * W;
  for (let i = 0; i < STAGES.length; i++) {
    const s = STAGES[i];
    if (x <= s.w || i === STAGES.length - 1) {
      let local = Math.min(1, x / s.w);
      if (i === STAGES.length - 1) local = Math.min(1, local / 0.7);
      return { stage: i, local, frame: s.f[0] + local * (s.f[1] - s.f[0]) };
    }
    x -= s.w;
  }
  return { stage: STAGES.length - 1, local: 1, frame: FRAMES - 1 };
}

/** Middle frame of a stage (stills for the static page). */
export const stillOf = (stage: number) => Math.round((STAGES[stage].f[0] + STAGES[stage].f[1]) / 2);

export const framePath = (size: number, i: number) => {
  const idx = Math.max(0, Math.min(FRAMES - 1, Math.round(i)));
  return `${FRAME_DIR}/${size}/frame_${String(idx + 1).padStart(4, '0')}.webp`;
};

export const pad = (n: number) => String(n).padStart(2, '0');
