'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Language, getTranslation, DEFAULT_LANGUAGE } from './i18n';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_STORAGE_KEY = 'dji-planner-language';

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(DEFAULT_LANGUAGE);

  useEffect(() => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY) as Language | null;

    if (stored && (stored === 'cs' || stored === 'en')) {
      setLanguageState(stored);
      return;
    }

    const browserLang = navigator.language.toLowerCase();

    if (browserLang.startsWith('cs')) {
      setLanguageState('cs');
    } else if (browserLang.startsWith('en')) {
      setLanguageState('en');
    }
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  };

  const t = (key: string): string => {
    return getTranslation(language, key);
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);

  if (context === undefined) {
    if (typeof window === 'undefined') {
      return {
        language: DEFAULT_LANGUAGE,
        setLanguage: () => {},
        t: (key: string) => getTranslation(DEFAULT_LANGUAGE, key),
      };
    }

    throw new Error('useLanguage must be used within LanguageProvider');
  }

  return context;
}

export function useTranslation() {
  const { t } = useLanguage();
  return { t };
}