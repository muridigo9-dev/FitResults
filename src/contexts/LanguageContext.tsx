import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Language,
  LanguageInfo,
  availableLanguages,
  defaultLanguage,
  isLanguageAvailable,
  translate,
  getStoredLanguage,
  setStoredLanguage
} from '@/i18n';

/**
 * Maps whatever a signup flow recorded as the user's language onto the tags this
 * app actually ships. The quiz funnel writes a short code ("es") into
 * `user_metadata.locale` when it provisions a buyer; other flows may write the
 * full tag. Both have to land somewhere real.
 */
function resolveMetadataLanguage(raw: unknown): Language | null {
  if (typeof raw !== 'string' || raw === '') return null;
  if (isLanguageAvailable(raw)) return raw as Language;

  const short: Record<string, Language> = {
    es: 'es-ES',
    en: 'en-US',
    pt: 'pt-BR',
  };
  return short[raw.slice(0, 2).toLowerCase()] ?? null;
}

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, paramsOrOptions?: Record<string, any>) => any;
  availableLanguages: LanguageInfo[];
  currentLanguageInfo: LanguageInfo;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

interface LanguageProviderProps {
  children: ReactNode;
}

export function LanguageProvider({ children }: LanguageProviderProps) {
  const [language, setLanguageState] = React.useState<Language>(() => {
    // Initialize from localStorage or default
    return getStoredLanguage() || defaultLanguage;
  });

  // Update stored language when it changes
  const setLanguage = React.useCallback((newLanguage: Language) => {
    setLanguageState(newLanguage);
    setStoredLanguage(newLanguage);
  }, []);

  // Translation function
  const t = React.useCallback((key: string, paramsOrOptions?: Record<string, any>): any => {
    return translate(key, language, paramsOrOptions, defaultLanguage);
  }, [language]);

  // Get current language info
  const currentLanguageInfo = availableLanguages.find(
    lang => lang.code === language
  ) || availableLanguages[0];

  // Sync with localStorage on mount
  React.useEffect(() => {
    const stored = getStoredLanguage();
    if (stored && stored !== language) {
      setLanguageState(stored);
    }
  }, []);

  /**
   * Adopt the language the account was created in, when the visitor has not
   * chosen one on this device yet.
   *
   * This is what keeps a buyer from crossing a language boundary mid-purchase.
   * Someone who answered a Spanish quiz on quiz.moovebody.com and received a
   * Spanish credentials email arrives here with an empty localStorage, and
   * without this would land in pt-BR — the app's default — with no idea that a
   * Spanish version exists.
   *
   * A stored choice always wins: this only fills the gap on first visit, and
   * `setLanguage` writes to localStorage, so switching manually is permanent
   * from then on.
   */
  React.useEffect(() => {
    if (getStoredLanguage()) return;

    let cancelled = false;

    const adopt = (metadata: Record<string, unknown> | undefined) => {
      if (cancelled || getStoredLanguage()) return;
      const resolved = resolveMetadataLanguage(metadata?.locale);
      if (resolved) setLanguageState(resolved);
    };

    void supabase.auth.getSession().then(({ data }) => adopt(data.session?.user?.user_metadata));

    // The session often resolves after this provider mounts, so the one-shot
    // read above can miss it on a cold load.
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      adopt(session?.user?.user_metadata);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const value: LanguageContextType = {
    language,
    setLanguage,
    t,
    availableLanguages,
    currentLanguageInfo,
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextType {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

// Alias for convenience
export const useI18n = useLanguage;
