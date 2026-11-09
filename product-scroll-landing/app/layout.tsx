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
import { SpeedInsights } from '@vercel/speed-insights/next';
import './globals.css';
import { I18nProvider } from '@/lib/i18n';

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

export const metadata: Metadata = {
  title: 'ACME X1 — product scroll landing',
  description: 'Scroll-driven product landing: the product assembles itself part by part as you scroll.',
};
export const viewport: Viewport = { themeColor: '#ebebeb', width: 'device-width', initialScale: 1 };

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
      </body>
    </html>
  );
}
