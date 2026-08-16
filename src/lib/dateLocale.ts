import { ptBR, enUS, es } from "date-fns/locale";
import type { Locale } from "date-fns";
import { useI18nSafe } from "@/hooks/useI18nSafe";

/**
 * date-fns locale for a language tag.
 *
 * Without this, `format(date, "EEEE")` renders weekday and month names in
 * Portuguese no matter which language the app is set to — the calendar was the
 * one place that stayed pt-BR even after the surrounding copy was translated.
 */
export function getDateLocale(language: string | undefined | null): Locale {
  if (!language) return ptBR;
  if (language.startsWith("en")) return enUS;
  if (language.startsWith("es")) return es;
  return ptBR;
}

/** The date-fns locale matching the reader's current language. */
export function useDateLocale(): Locale {
  const { language } = useI18nSafe();
  return getDateLocale(language);
}
