import { useContext } from 'react';
import { LanguageContext } from '@/contexts/LanguageContext';
import { translate, defaultLanguage, availableLanguages, type Language, type LanguageInfo } from '@/i18n';

/**
 * Safe i18n hook that works even outside of LanguageProvider
 * Returns translation function with fallback to default language
 */
export function useI18nSafe() {
  const context = useContext(LanguageContext);

  // If context is available, use it
  if (context) {
    return context;
  }

  // Fallback implementation when outside provider
  const fallbackT = (key: string, paramsOrOptions?: Record<string, any>): any => {
    return translate(key, defaultLanguage, paramsOrOptions, defaultLanguage);
  };

  const fallbackLanguageInfo: LanguageInfo = availableLanguages[0] || {
    code: 'pt-BR' as Language,
    name: 'Português (Brasil)',
    nativeName: 'Português (Brasil)',
    flag: '🇧🇷'
  };

  return {
    language: defaultLanguage,
    setLanguage: () => {
      console.warn('setLanguage called outside of LanguageProvider');
    },
    t: fallbackT,
    availableLanguages,
    currentLanguageInfo: fallbackLanguageInfo,
  };
}

/**
 * Get translation function directly without React context
 * Useful for non-component code or when you just need the function
 */
export function getTranslationFn(language: Language = defaultLanguage) {
  return (key: string, paramsOrOptions?: Record<string, any>): any => translate(key, language, paramsOrOptions, defaultLanguage);
}
