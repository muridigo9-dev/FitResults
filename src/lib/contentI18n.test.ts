import { describe, it, expect } from "vitest";
import { localeSuffix, localizedField, localizedFieldFrom } from "./contentI18n";

/** Shape of a row as it comes back from Supabase. */
const exercise = {
  name: "Mãos como Nuvens",
  name_en: "Cloud Hands",
  name_es: "Manos de Nube",
  description: "Deslocamento lateral contínuo",
  description_en: "A continuous lateral travel",
  description_es: "Desplazamiento lateral continuo",
};

describe("localeSuffix", () => {
  it("maps language tags to column suffixes", () => {
    expect(localeSuffix("en-US")).toBe("en");
    expect(localeSuffix("es-ES")).toBe("es");
  });

  it("returns null for pt-BR, so the base column is used", () => {
    expect(localeSuffix("pt-BR")).toBeNull();
  });

  it("falls back to the base column for unknown or missing languages", () => {
    expect(localeSuffix("fr-FR")).toBeNull();
    expect(localeSuffix(undefined)).toBeNull();
    expect(localeSuffix("")).toBeNull();
  });
});

describe("localizedField", () => {
  it("reads the translation for the reader's language", () => {
    expect(localizedField(exercise, "name", "en-US")).toBe("Cloud Hands");
    expect(localizedField(exercise, "name", "es-ES")).toBe("Manos de Nube");
    expect(localizedField(exercise, "description", "en-US")).toBe("A continuous lateral travel");
  });

  it("reads the base column for pt-BR", () => {
    expect(localizedField(exercise, "name", "pt-BR")).toBe("Mãos como Nuvens");
  });

  it("falls back to pt-BR when the translation is missing or blank", () => {
    const partial = { name: "Puxar a Seda", name_en: null, name_es: "   " };
    expect(localizedField(partial, "name", "en-US")).toBe("Puxar a Seda");
    expect(localizedField(partial, "name", "es-ES")).toBe("Puxar a Seda");
  });

  it("returns an empty string rather than throwing on missing rows or fields", () => {
    expect(localizedField(null, "name", "en-US")).toBe("");
    expect(localizedField(undefined, "name", "en-US")).toBe("");
    expect(localizedField(exercise, "instructions", "en-US")).toBe("");
  });
});

describe("localizedFieldFrom", () => {
  // A workout exercise is a copy of a library exercise; when only the library
  // row carries a translation, the copy should still read in the right language.
  const workoutRow = { name: "Mãos como Nuvens", name_en: null, name_es: null };

  it("takes a translation from a later row before falling back to any base", () => {
    expect(localizedFieldFrom([workoutRow, exercise], "name", "en-US")).toBe("Cloud Hands");
    expect(localizedFieldFrom([workoutRow, exercise], "name", "es-ES")).toBe("Manos de Nube");
  });

  it("prefers the first row's own translation when it has one", () => {
    const renamed = { name: "Nuvens (adaptado)", name_en: "Cloud Hands (adapted)" };
    expect(localizedFieldFrom([renamed, exercise], "name", "en-US")).toBe("Cloud Hands (adapted)");
  });

  it("uses the first available base value for pt-BR", () => {
    expect(localizedFieldFrom([workoutRow, exercise], "name", "pt-BR")).toBe("Mãos como Nuvens");
  });

  it("skips null rows", () => {
    expect(localizedFieldFrom([null, undefined, exercise], "name", "en-US")).toBe("Cloud Hands");
  });

  it("returns an empty string when nothing has the field", () => {
    expect(localizedFieldFrom([null, {}], "name", "en-US")).toBe("");
  });
});
