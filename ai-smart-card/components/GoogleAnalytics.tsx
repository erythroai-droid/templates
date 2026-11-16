'use client';
import Script from 'next/script';
import { useEffect } from 'react';
import { GA_ID, GA_ON, gaEvent } from '@/lib/ga';

/** Scroll-depth marks sent as GA4 `scroll` { percent_scrolled }. 90 is left to GA4's enhanced measurement, which sends it on its own. */
const SCROLL_MARKS = [25, 50, 75];
/** Seconds of visible (tab in front) time sent as `demo_time` { seconds }. */
const TIME_MARKS = [15, 30, 60, 120, 300];

// GA4 tag (gtag.js) + page_view, plus scroll-depth and time-on-demo events. Renders nothing in dev or when GA_ID is off.
export function GoogleAnalytics() {
  useEffect(() => {
    if (!GA_ON) return;

    const sentScroll = new Set<number>();
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (max <= 0) return;
      const pct = (window.scrollY / max) * 100;
      for (const m of SCROLL_MARKS) {
        if (pct >= m && !sentScroll.has(m)) { sentScroll.add(m); gaEvent('scroll', { percent_scrolled: m }); }
      }
      if (sentScroll.size === SCROLL_MARKS.length) window.removeEventListener('scroll', onScroll);
    };
    window.addEventListener('scroll', onScroll, { passive: true });

    // visible time only: a backgrounded tab doesn't count
    let seen = 0, next = 0;
    const tick = window.setInterval(() => {
      if (document.hidden || next >= TIME_MARKS.length) return;
      seen += 1;
      if (seen >= TIME_MARKS[next]) { gaEvent('demo_time', { seconds: TIME_MARKS[next] }); next += 1; }
    }, 1000);

    return () => { window.removeEventListener('scroll', onScroll); window.clearInterval(tick); };
  }, []);

  if (!GA_ON) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`} strategy="afterInteractive" />
      <Script id="ga4" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
gtag('js',new Date());gtag('config','${GA_ID}');`}
      </Script>
    </>
  );
}
