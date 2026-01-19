import { describe, it, expect, expectTypeOf, vi, beforeEach } from "vitest";

// We can't fully test Next.js server functions without mocking,
// but we can test the parseAcceptLanguage logic and types

describe("Next.js integration types", () => {
  it("should export configureI18n", async () => {
    const { configureI18n } = await import("../src/next");
    expect(typeof configureI18n).toBe("function");
  });

  it("should export getLocale", async () => {
    const { getLocale } = await import("../src/next");
    expect(typeof getLocale).toBe("function");
  });

  it("should export getTranslation", async () => {
    const { getTranslation } = await import("../src/next");
    expect(typeof getTranslation).toBe("function");
  });

  it("should re-export interpolate", async () => {
    const { interpolate } = await import("../src/next");
    expect(interpolate("Hello, {name}!", { name: "World" })).toBe(
      "Hello, World!",
    );
  });

  it("should re-export defineTranslations", async () => {
    const { defineTranslations } = await import("../src/next");
    const dict = defineTranslations({
      test: { en: "Test" },
    });
    expect(dict.test.en).toBe("Test");
  });
});

describe("NextI18nConfig type", () => {
  it("should accept valid config", async () => {
    const { configureI18n } = await import("../src/next");

    // This should type check
    configureI18n({
      defaultLocale: "en",
      locales: ["en", "de", "fr"],
      cookieName: "locale",
      fallbackLocale: "en",
    });
  });
});
