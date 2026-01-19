import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import {
  parseTranslationFile,
  parseTranslationContent,
  generateTranslationContent,
  writeTranslationFile,
  updateTranslation,
  addTranslationKey,
  deleteTranslationKey,
} from "../src/studio/parser";

describe("Studio Parser", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-studio-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("parseTranslationContent", () => {
    it("should parse basic translation exports", () => {
      const content = `
export const login = { en: "Sign in", de: "Anmelden" } as const;
export const logout = { en: "Sign out", de: "Abmelden" } as const;
      `;

      const result = parseTranslationContent(content);

      expect(result.entries).toHaveLength(2);
      expect(result.locales).toEqual(["de", "en"]);

      const login = result.entries.find((e) => e.key === "login");
      expect(login?.translations).toEqual({
        en: "Sign in",
        de: "Anmelden",
      });
    });

    it("should handle escaped quotes", () => {
      const content = `export const quote = { en: "Say \\"Hello\\"" } as const;`;

      const result = parseTranslationContent(content);

      expect(result.entries[0]?.translations.en).toBe('Say "Hello"');
    });

    it("should handle multiline objects", () => {
      const content = `
export const greeting = {
  en: "Hello",
  de: "Hallo",
  fr: "Bonjour"
} as const;
      `;

      const result = parseTranslationContent(content);

      expect(result.entries[0]?.translations).toEqual({
        en: "Hello",
        de: "Hallo",
        fr: "Bonjour",
      });
      expect(result.locales).toEqual(["de", "en", "fr"]);
    });

    it("should handle interpolation variables", () => {
      const content = `export const welcome = { en: "Hello {name}!" } as const;`;

      const result = parseTranslationContent(content);

      expect(result.entries[0]?.translations.en).toBe("Hello {name}!");
    });
  });

  describe("generateTranslationContent", () => {
    it("should generate valid TypeScript", () => {
      const entries = [
        { key: "login", translations: { en: "Sign in", de: "Anmelden" } },
        { key: "logout", translations: { en: "Sign out", de: "Abmelden" } },
      ];

      const content = generateTranslationContent(entries, ["en", "de"]);

      expect(content).toContain("export const login = {");
      expect(content).toContain('en: "Sign in"');
      expect(content).toContain('de: "Anmelden"');
      expect(content).toContain("} as const;");
    });

    it("should escape quotes in values", () => {
      const entries = [
        { key: "quote", translations: { en: 'Say "Hello"' } },
      ];

      const content = generateTranslationContent(entries, ["en"]);

      expect(content).toContain('en: "Say \\"Hello\\""');
    });

    it("should sort entries alphabetically", () => {
      const entries = [
        { key: "zebra", translations: { en: "Zebra" } },
        { key: "apple", translations: { en: "Apple" } },
      ];

      const content = generateTranslationContent(entries, ["en"]);

      const appleIndex = content.indexOf("apple");
      const zebraIndex = content.indexOf("zebra");
      expect(appleIndex).toBeLessThan(zebraIndex);
    });
  });

  describe("file operations", () => {
    it("should write and read translation file", () => {
      const filePath = path.join(tmpDir, "translations.ts");
      const entries = [
        { key: "hello", translations: { en: "Hello", de: "Hallo" } },
      ];

      writeTranslationFile(filePath, entries, ["en", "de"]);

      const parsed = parseTranslationFile(filePath);
      expect(parsed.entries).toHaveLength(1);
      expect(parsed.entries[0]?.translations.en).toBe("Hello");
    });

    it("should update existing translation", () => {
      const filePath = path.join(tmpDir, "translations.ts");
      const entries = [
        { key: "hello", translations: { en: "Hello", de: "Hallo" } },
      ];

      writeTranslationFile(filePath, entries, ["en", "de"]);
      updateTranslation(filePath, "hello", "de", "Moin");

      const parsed = parseTranslationFile(filePath);
      expect(parsed.entries[0]?.translations.de).toBe("Moin");
    });

    it("should add new locale to existing key", () => {
      const filePath = path.join(tmpDir, "translations.ts");
      const entries = [
        { key: "hello", translations: { en: "Hello" } },
      ];

      writeTranslationFile(filePath, entries, ["en"]);
      updateTranslation(filePath, "hello", "fr", "Bonjour");

      const parsed = parseTranslationFile(filePath);
      expect(parsed.entries[0]?.translations.fr).toBe("Bonjour");
      expect(parsed.locales).toContain("fr");
    });

    it("should add new translation key", () => {
      const filePath = path.join(tmpDir, "translations.ts");
      const entries = [
        { key: "hello", translations: { en: "Hello" } },
      ];

      writeTranslationFile(filePath, entries, ["en"]);
      addTranslationKey(filePath, "goodbye", { en: "Goodbye", de: "Tschüss" });

      const parsed = parseTranslationFile(filePath);
      expect(parsed.entries).toHaveLength(2);

      const goodbye = parsed.entries.find((e) => e.key === "goodbye");
      expect(goodbye?.translations.en).toBe("Goodbye");
      expect(goodbye?.translations.de).toBe("Tschüss");
    });

    it("should throw when adding duplicate key", () => {
      const filePath = path.join(tmpDir, "translations.ts");
      const entries = [
        { key: "hello", translations: { en: "Hello" } },
      ];

      writeTranslationFile(filePath, entries, ["en"]);

      expect(() => {
        addTranslationKey(filePath, "hello", { en: "Hi" });
      }).toThrow('Translation key "hello" already exists');
    });

    it("should delete translation key", () => {
      const filePath = path.join(tmpDir, "translations.ts");
      const entries = [
        { key: "hello", translations: { en: "Hello" } },
        { key: "goodbye", translations: { en: "Goodbye" } },
      ];

      writeTranslationFile(filePath, entries, ["en"]);
      deleteTranslationKey(filePath, "hello");

      const parsed = parseTranslationFile(filePath);
      expect(parsed.entries).toHaveLength(1);
      expect(parsed.entries[0]?.key).toBe("goodbye");
    });

    it("should throw when deleting non-existent key", () => {
      const filePath = path.join(tmpDir, "translations.ts");
      const entries = [
        { key: "hello", translations: { en: "Hello" } },
      ];

      writeTranslationFile(filePath, entries, ["en"]);

      expect(() => {
        deleteTranslationKey(filePath, "nonexistent");
      }).toThrow('Translation key "nonexistent" not found');
    });
  });

  describe("roundtrip", () => {
    it("should preserve content through parse/generate cycle", () => {
      const original = [
        { key: "login", translations: { en: "Sign in", de: "Anmelden" } },
        { key: "welcome", translations: { en: "Welcome {name}!", de: "Willkommen {name}!" } },
      ];
      const locales = ["de", "en"];

      const content = generateTranslationContent(original, locales);
      const parsed = parseTranslationContent(content);

      expect(parsed.entries).toHaveLength(2);
      expect(parsed.locales).toEqual(locales);

      const login = parsed.entries.find((e) => e.key === "login");
      expect(login?.translations).toEqual(original[0]?.translations);

      const welcome = parsed.entries.find((e) => e.key === "welcome");
      expect(welcome?.translations).toEqual(original[1]?.translations);
    });
  });
});
