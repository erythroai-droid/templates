'use client';
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DICTS } from './dict';

export type Lang = 'en' | 'ru' | 'he' | 'ar';
export const LANGS: { code: Lang; label: string; name: string }[] = [
  { code: 'en', label: 'EN', name: 'English' },
  { code: 'ru', label: 'RU', name: 'Русский' },
  { code: 'he', label: 'HE', name: 'עברית' },
  { code: 'ar', label: 'AR', name: 'العربية' },
];

type Dict = Record<string, string>;
const D = DICTS as unknown as Record<Lang, Dict>;

type Ctx = { lang: Lang; dir: 'ltr' | 'rtl'; t: (k: string) => string; setLang: (l: Lang) => void };
const I18n = createContext<Ctx>({ lang: 'en', dir: 'ltr', t: (k) => D.en[k] ?? k, setLang: () => {} });
export const useI18n = () => useContext(I18n);

function normalizeLang(value: string | null | undefined): Lang | null {
  if (!value) return null;
  const base = value.trim().toLowerCase().split(/[-_]/)[0];
  if (base === 'iw' || base === 'he') return 'he';
  if (base === 'en' || base === 'ru' || base === 'ar') return base;
  return null;
}

function detectBrowserLang(): Lang | null {
  if (typeof navigator === 'undefined') return null;
  const candidates = [...(navigator.languages ?? []), navigator.language].filter(Boolean);
  for (const raw of candidates) {
    const matched = normalizeLang(raw);
    if (matched) return matched;
  }
  return null;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    let l: Lang = 'en';
    try {
      const q = new URLSearchParams(window.location.search);
      // ?lang=he wins; otherwise an ad campaign named "…_he" / "…_ru" / "…_ar" / "…_en" sets the language,
      // so Hebrew ads open the RTL version even when the ad link has no lang parameter
      const urlLang = normalizeLang(q.get('lang')) ?? normalizeLang(q.get('utm_campaign')?.match(/[_-](he|iw|ru|ar|en)$/i)?.[1]);
      if (urlLang) {
        l = urlLang;
        localStorage.setItem('lang', urlLang);
      } else {
        const saved = normalizeLang(localStorage.getItem('lang'));
        l = saved ?? detectBrowserLang() ?? 'en';
      }
    } catch {
      l = detectBrowserLang() ?? 'en';
    }
    setLangState(l);
  }, []);

  const dir = lang === 'he' || lang === 'ar' ? 'rtl' : 'ltr';
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try { localStorage.setItem('lang', l); } catch { /* ignore */ }
  }, []);

  const value = useMemo<Ctx>(() => ({ lang, dir, setLang, t: (k) => D[lang][k] ?? D.en[k] ?? D.ru[k] ?? k }),[lang, dir, setLang]);
  return <I18n.Provider value={value}>{children}</I18n.Provider>;
}
