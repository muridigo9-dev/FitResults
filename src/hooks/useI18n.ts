// Re-export from context for convenience
export { useI18n, useLanguage } from '@/contexts/LanguageContext';

// Export safe version that works outside of LanguageProvider
export { useI18nSafe, getTranslationFn } from './useI18nSafe';
