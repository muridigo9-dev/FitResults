import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  Language,
  LanguageInfo,
  availableLanguages,
  defaultLanguage,
  translate,
  getStoredLanguage,
  setStoredLanguage
} from '@/i18n';

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
