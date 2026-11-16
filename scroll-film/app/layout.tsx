import type { Metadata, Viewport } from 'next';
import localFont from 'next/font/local';
// Self-host via fontsource — next/font/google flaky on Vercel (extensionless /l/font?kit= URLs)
import '@fontsource/inter/latin-300.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
import '@fontsource/inter/cyrillic-300.css';
import '@fontsource/inter/cyrillic-400.css';
import '@fontsource/inter/cyrillic-500.css';
import '@fontsource/inter/cyrillic-600.css';
import '@fontsource/heebo/latin-300.css';
import '@fontsource/heebo/latin-400.css';
import '@fontsource/heebo/latin-500.css';
import '@fontsource/heebo/latin-600.css';
import '@fontsource/heebo/hebrew-300.css';
import '@fontsource/heebo/hebrew-400.css';
import '@fontsource/heebo/hebrew-500.css';
import '@fontsource/heebo/hebrew-600.css';
// EMBER display serif + handwritten accent (Latin + Cyrillic); Hebrew/Arabic fall back to Heebo / True Arabic
import '@fontsource/playfair-display/latin-500.css';
import '@fontsource/playfair-display/latin-600.css';
import '@fontsource/playfair-display/cyrillic-500.css';
import '@fontsource/playfair-display/cyrillic-600.css';
import '@fontsource/great-vibes/latin-400.css';
import '@fontsource/great-vibes/cyrillic-400.css';
import { Analytics } from '@vercel/analytics/next';
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';
import { BRAND, DESCRIPTION, MODEL, SITE_URL, TITLE } from '@/lib/site';
import { MetaPixel } from '@/components/MetaPixel';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';

// Arabic (+ paired Latin): True Arabic
const trueArabic = localFont({
  src: [
    { path: './fonts/TrueArabic-Light.otf', weight: '300', style: 'normal' },
    { path: './fonts/TrueArabic-Regular.otf', weight: '400', style: 'normal' },
    { path: './fonts/TrueArabic-Medium.otf', weight: '500', style: 'normal' },
    { path: './fonts/TrueArabic-Semibold.otf', weight: '600', style: 'normal' },
  ],
  variable: '--font-ar',
  display: 'swap',
  preload: false,
});

// og/twitter images: app/opengraph-image.tsx + app/twitter-image.tsx (generated brand card). For a real client,
// drop a 1200x630 app/opengraph-image.jpg + twitter-image.jpg (+ .alt.txt) and delete the two .tsx files.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    url: '/',
    siteName: `${BRAND} ${MODEL}`,
    title: TITLE,
    description: DESCRIPTION,
    locale: 'en_US',
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
};
export const viewport: Viewport = { themeColor: '#0c0a09', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" dir="ltr" className={trueArabic.variable} suppressHydrationWarning>
      <head>
        {/* decide the static (no-animation) layout before first paint, so phones never flash the animated one */}
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.toggle('static',matchMedia('(max-width: 900px), (prefers-reduced-motion: reduce)').matches)" }} />
      </head>
      <body>
        <I18nProvider>{children}</I18nProvider>
        <SpeedInsights />
        <Analytics />
        <MetaPixel />
        <GoogleAnalytics />
      </body>
    </html>
  );
}
