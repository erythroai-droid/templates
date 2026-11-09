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

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    let l: Lang = 'en';
    try {
      const saved = localStorage.getItem('lang');
      if (saved === 'en' || saved === 'ru' || saved === 'he' || saved === 'ar') l = saved;   // English by default; only an explicit choice changes it
    } catch { /* storage unavailable */ }
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
