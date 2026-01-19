import { describe, it, expect, expectTypeOf } from "vitest";
import { createTranslation } from "../src/create";
import { defineTranslations } from "../src/define";

describe("createTranslation", () => {
  const auth = defineTranslations({
    login: { en: "Sign in", de: "Anmelden" },
    logout: { en: "Sign out", de: "Abmelden" },
  });

  const common = defineTranslations({
    save: { en: "Save", de: "Speichern" },
    cancel: { en: "Cancel", de: "Abbrechen" },
  });

  const greetings = defineTranslations({
    welcome: { en: "Hello, {name}!", de: "Hallo, {name}!" },
    farewell: { en: "Goodbye, {name}!", de: "Auf Wiedersehen, {name}!" },
  });

  it("should translate a simple key", () => {
    const t = createTranslation({ locale: "en" }, auth);
    expect(t("login")).toBe("Sign in");
  });

  it("should translate with different locale", () => {
    const t = createTranslation({ locale: "de" }, auth);
    expect(t("login")).toBe("Anmelden");
  });

  it("should merge multiple dictionaries", () => {
    const t = createTranslation({ locale: "en" }, auth, common);
    expect(t("login")).toBe("Sign in");
    expect(t("save")).toBe("Save");
  });

  it("should interpolate variables", () => {
    const t = createTranslation({ locale: "en" }, greetings);
    expect(t("welcome", { name: "John" })).toBe("Hello, John!");
  });

  it("should use fallback locale", () => {
    const partial = defineTranslations({
      hello: { en: "Hello", de: "Hallo" },
      special: { en: "Special" }, // no German translation
    });

    const t = createTranslation(
      { locale: "de", fallbackLocale: "en" },
      partial,
    );
    expect(t("hello")).toBe("Hallo");
    expect(t("special")).toBe("Special");
  });

  it("should return key if translation not found", () => {
    const empty = defineTranslations({});
    const t = createTranslation({ locale: "en" }, empty);
    // @ts-expect-error - testing runtime behavior for unknown key
    expect(t("unknown")).toBe("unknown");
  });

  it("should have correct types for keys", () => {
    const t = createTranslation({ locale: "en" }, auth, common);

    // Type should include all merged keys
    type KeyType = Parameters<typeof t>[0];
    expectTypeOf<"login">().toMatchTypeOf<KeyType>();
    expectTypeOf<"logout">().toMatchTypeOf<KeyType>();
    expectTypeOf<"save">().toMatchTypeOf<KeyType>();
    expectTypeOf<"cancel">().toMatchTypeOf<KeyType>();
  });

  it("should last dict wins on key collision", () => {
    const dict1 = defineTranslations({
      shared: { en: "First" },
    });
    const dict2 = defineTranslations({
      shared: { en: "Second" },
    });

    const t = createTranslation({ locale: "en" }, dict1, dict2);
    expect(t("shared")).toBe("Second");
  });
});
