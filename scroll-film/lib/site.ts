// Site + scroll-film config in one place.
// The film: one master video cut into WebP frame packs. The frames sit fixed behind the page and are scrubbed by the scroll;
// the content sections scroll over them in normal flow. Each scene says which frame the film shows when that section's top
// reaches the top of the screen; between two scenes the film plays through the frames in between.
//
// The template ships a 16-frame stub cut from a steak demo video so `npm run build` works and the motion is visible.
// For a client: `npm run frames -- <video> --every 2` (writes all packs, prints the count), set FRAMES, bump FRAMES_VERSION,
// cut the still tail if the video ends on a static shot (see README), retime SCENES from a contact sheet.

/** Frames per pack (same count in every pack). */
export const FRAMES = 16;

/** Landscape packs for wide screens, a centre-cropped portrait pack for phones. */
export const FRAME_DIR = '/frames/assembly';
export const PORTRAIT_DIR = '/frames/portrait/540';

/**
 * Frames are served with Cache-Control: immutable (next.config.mjs), so a re-extract under the same file names would mix old
 * cached frames with new ones in returning browsers. Bump this on every re-extract — it goes into every frame URL.
 */
export const FRAMES_VERSION = 'stub-16';

export const BRAND = 'ACME';
export const MODEL = 'Grill';

/** Production URL: canonical, Open Graph, sitemap. NEXT_PUBLIC_SITE_URL overrides it per Vercel environment. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || 'https://example.erythro.ai').replace(/\/$/, '');

/** Page title / description (also the Open Graph + Twitter card text). */
export const TITLE = `${BRAND} ${MODEL} — scroll-film landing`;
export const DESCRIPTION = `${BRAND} ${MODEL}: a scroll-driven film behind the page, scenes over it, a photo table and one clear call to action.`;

/**
 * Scenes in page order. id = section anchor (and i18n prefix), f = film frame when the section's top reaches the top of the
 * screen. Given as shares of the film so a re-extract at another density keeps the timing; retime them for the client's
 * video. The last scene reaches LAST_FRAME: from there the film holds and only the content scrolls.
 */
export const LAST_FRAME = FRAMES - 1;
const at = (share: number) => Math.round(share * LAST_FRAME);
export const SCENES = [
  { id: 'top', f: at(0) },
  { id: 'craft', f: at(0.13) },
  { id: 'cuts', f: at(0.36) },
  { id: 'feast', f: at(0.69) },
  { id: 'experience', f: LAST_FRAME },
] as const;

/** Menu on the cuts scene: i18n cut{n}n / cut{n}d, weight in grams. */
export const CUTS = [
  { n: 1, g: 350 },
  { n: 2, g: 300 },
  { n: 3, g: 200 },
  { n: 4, g: 1200 },
] as const;

/**
 * Gallery: photos as WebP in /public/gallery at 1000 and 2000 px wide (`<src>-1000.webp`, `<src>-2000.webp`); a = width /
 * height; i18n gal{n}. The template ships video stills as stand-ins — replace them with the client's photos.
 * Prints lie scattered on a stone table. d = desktop spot, m = phone spot: x / y = centre of the print in % of the table
 * (x from the start side, so RTL mirrors it), w = print width in vw, r = rotation in degrees. Later prints lie on top.
 */
export const GALLERY = [
  { n: 1, src: '/gallery/photo-1', a: 16 / 9, d: { x: 31, y: 64, w: 30, r: -7 }, m: { x: 50, y: 9, w: 82, r: -4 } },
  { n: 2, src: '/gallery/photo-2', a: 16 / 9, d: { x: 55, y: 38, w: 22, r: 5 }, m: { x: 42, y: 28, w: 66, r: 6 } },
  { n: 3, src: '/gallery/photo-3', a: 16 / 9, d: { x: 74, y: 66, w: 24, r: -4 }, m: { x: 58, y: 48, w: 68, r: -5 } },
  { n: 4, src: '/gallery/photo-4', a: 16 / 9, d: { x: 50, y: 78, w: 19, r: 9 }, m: { x: 44, y: 68, w: 62, r: 7 } },
  { n: 5, src: '/gallery/photo-5', a: 16 / 9, d: { x: 84, y: 30, w: 19, r: -10 }, m: { x: 56, y: 88, w: 66, r: -6 } },
] as const;

/** Table texture behind the gallery (the template ships a generated dark grain). */
export const GALLERY_TABLE = '/gallery/stone-2400.webp';

/**
 * Footer backdrop loop under a dark veil (e.g. the venue hall). null = a plain dark footer.
 * Cut it as a seamless loop (last second cross-faded into the first, see README): desktop ~1280 px, phone ~854 px, + poster.
 */
export const FOOTER_VIDEO: { desktop: string; phone: string; poster: string } | null = null;

export const landscapePath = (size: number, i: number) =>
  `${FRAME_DIR}/${size}/frame_${String(Math.max(0, Math.min(FRAMES - 1, Math.round(i))) + 1).padStart(4, '0')}.webp?v=${FRAMES_VERSION}`;
export const portraitPath = (i: number) =>
  `${PORTRAIT_DIR}/frame_${String(Math.max(0, Math.min(FRAMES - 1, Math.round(i))) + 1).padStart(4, '0')}.webp?v=${FRAMES_VERSION}`;

export const pad = (n: number) => String(n).padStart(2, '0');
