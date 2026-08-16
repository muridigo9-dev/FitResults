/**
 * Localisation for content that lives in the database rather than in the locale
 * files: exercises, workouts, muscle groups, exercise taxonomy.
 *
 * The storage shape mirrors what feature_flags already does — the base column
 * holds pt-BR (the language the content is authored in) and `_en` / `_es`
 * columns hold the translations. A missing or blank translation falls back to
 * the base column, so a half-translated row still reads correctly instead of
 * rendering an empty card.
 */

/** Column suffix for a language tag, or null when the base column is the answer. */
export function localeSuffix(language: string | undefined | null): "en" | "es" | null {
  if (!language) return null;
  if (language.startsWith("en")) return "en";
  if (language.startsWith("es")) return "es";
  return null; // pt-BR and anything unknown reads the base column
}

type ContentRow = Record<string, unknown> | null | undefined;

function readString(row: ContentRow, key: string): string | null {
  const value = row?.[key];
  return typeof value === "string" && value.trim() !== "" ? value : null;
}

/**
 * Reads `field` from a database row in the given language.
 *
 * @example localizedField(exerciseRow, "name", "es-ES") // name_es ?? name
 */
export function localizedField(
  row: ContentRow,
  field: string,
  language: string | undefined | null,
): string {
  return localizedFieldFrom([row], field, language);
}

/**
 * Same as `localizedField`, but consults several rows in priority order: it
 * takes the first translation available anywhere, and only then falls back to
 * the first base value.
 *
 * A workout exercise carries its own name (an admin may rename a movement for
 * one workout) but is usually a straight copy of the library exercise. When
 * only the library row has been translated, the copy should still render in the
 * reader's language rather than dropping back to pt-BR.
 */
export function localizedFieldFrom(
  rows: ContentRow[],
  field: string,
  language: string | undefined | null,
): string {
  const suffix = localeSuffix(language);

  if (suffix) {
    for (const row of rows) {
      const translated = readString(row, `${field}_${suffix}`);
      if (translated) return translated;
    }
  }

  for (const row of rows) {
    const base = readString(row, field);
    if (base) return base;
  }

  return "";
}
