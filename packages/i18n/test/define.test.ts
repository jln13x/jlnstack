import { describe, it, expect, expectTypeOf } from "vitest";
import { defineTranslations } from "../src/define";

describe("defineTranslations", () => {
  it("should return the same object", () => {
    const translations = {
      login: { en: "Sign in", de: "Anmelden" },
      logout: { en: "Sign out", de: "Abmelden" },
    };

    const result = defineTranslations(translations);

    expect(result).toBe(translations);
  });

  it("should preserve exact types", () => {
    const translations = defineTranslations({
      login: { en: "Sign in", de: "Anmelden" },
      logout: { en: "Sign out", de: "Abmelden" },
    });

    expectTypeOf(translations).toHaveProperty("login");
    expectTypeOf(translations).toHaveProperty("logout");
    expectTypeOf(translations.login).toHaveProperty("en");
    expectTypeOf(translations.login).toHaveProperty("de");
  });

  it("should allow destructuring for tree-shaking", () => {
    const translations = defineTranslations({
      save: { en: "Save", de: "Speichern" },
      cancel: { en: "Cancel", de: "Abbrechen" },
    });

    const { save, cancel } = translations;

    expect(save.en).toBe("Save");
    expect(cancel.de).toBe("Abbrechen");
  });

  it("should preserve literal types for interpolation extraction", () => {
    const translations = defineTranslations({
      greeting: { en: "Hello, {name}!", de: "Hallo, {name}!" },
    } as const);

    // The type should preserve the literal string for ExtractVars to work
    expectTypeOf(translations.greeting.en).toEqualTypeOf<"Hello, {name}!">();
  });
});
