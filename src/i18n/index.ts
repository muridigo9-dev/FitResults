import type { Language, LanguageInfo, TranslationKeys } from './types';

// Use Vite's glob import to automatically discover all locale files
const localeModules = import.meta.glob('./locales/*.json', { eager: true });

// Type for locale module with _meta
interface LocaleModule {
  _meta?: {
    code: string;
    name: string;
    nativeName: string;
    flag: string;
  };
  [key: string]: unknown;
}

// Build translations and available languages dynamically from discovered files
const translations: Record<string, TranslationKeys> = {};
const discoveredLanguages: LanguageInfo[] = [];

// Process each discovered locale file
Object.entries(localeModules).forEach(([path, module]) => {
  const localeData = module as LocaleModule;

  // Extract metadata from the _meta field in the JSON
  if (localeData._meta) {
    const { code, name, nativeName, flag } = localeData._meta;

    // Add to available languages
    discoveredLanguages.push({ code: code as Language, name, nativeName, flag });

    // Add translations (excluding _meta)
    const { _meta, ...translationData } = localeData;
    translations[code] = translationData as unknown as TranslationKeys;
  } else {
    // Fallback: extract code from filename (e.g., './locales/pt-BR.json' -> 'pt-BR')
    const match = path.match(/\.\/locales\/(.+)\.json$/);
    if (match) {
      const code = match[1];
      translations[code] = localeData as unknown as TranslationKeys;
      // Add with minimal info if no _meta present
      discoveredLanguages.push({
        code: code as Language,
        name: code,
        nativeName: code,
        flag: '🌐'
      });
    }
  }
});

// Sort languages: pt-BR first (default), then alphabetically by code
discoveredLanguages.sort((a, b) => {
  if (a.code === 'pt-BR') return -1;
  if (b.code === 'pt-BR') return 1;
  return a.code.localeCompare(b.code);
});

// Export discovered languages
export const availableLanguages: LanguageInfo[] = discoveredLanguages;

// Default language
export const defaultLanguage: Language = 'pt-BR';

// Get translation by language
export function getTranslations(language: Language): TranslationKeys {
  return translations[language] || translations[defaultLanguage];
}

// Get nested value from object by dot notation key
function getNestedValue(obj: unknown, path: string): unknown {
  const keys = path.split('.');
  let current: unknown = obj;

  for (const key of keys) {
    if (current === null || current === undefined || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }

  return current;
}

// Translate function
export function translate(
  key: string,
  language: Language = defaultLanguage,
  paramsOrOptions?: Record<string, any>,
  fallbackLanguage: Language = defaultLanguage
): any {
  // Try current language first
  const currentTranslations = getTranslations(language);
  let value = getNestedValue(currentTranslations, key);

  if (!value && language !== fallbackLanguage) {
    // Try fallback language if different
    const fallbackTranslations = getTranslations(fallbackLanguage);
    value = getNestedValue(fallbackTranslations, key);
  }

  if (!value) {
    // Return key as last resort (debug-friendly)
    return paramsOrOptions?.returnObjects ? undefined : key;
  }

  // If returnObjects is requested, return the raw value (if it's an object/array)
  if (paramsOrOptions?.returnObjects && typeof value !== 'string') {
    return value;
  }

  // Ensure we return a string for interpolation
  const stringValue = String(value);

  // Handle interpolation if params are provided
  if (paramsOrOptions) {
    let interpolatedValue = stringValue;
    Object.entries(paramsOrOptions).forEach(([paramKey, paramValue]) => {
      // Only interpolate string/number values
      if (typeof paramValue === 'string' || typeof paramValue === 'number') {
        interpolatedValue = interpolatedValue.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
      }
    });
    return interpolatedValue;
  }

  return stringValue;
}

// Storage key for language preference
export const LANGUAGE_STORAGE_KEY = 'fitlife-language';

// Get stored language from localStorage
export function getStoredLanguage(): Language | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
  if (stored && availableLanguages.some(lang => lang.code === stored)) {
    return stored as Language;
  }
  return null;
}

// Save language to localStorage
export function setStoredLanguage(language: Language): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
}

// Helper to check if a language is available
export function isLanguageAvailable(code: string): boolean {
  return availableLanguages.some(lang => lang.code === code);
}

// Get language info by code
export function getLanguageInfo(code: string): LanguageInfo | undefined {
  return availableLanguages.find(lang => lang.code === code);
}

export type { Language, LanguageInfo, TranslationKeys };
