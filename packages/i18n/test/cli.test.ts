import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { migrate } from "../src/cli/migrate";
import { check } from "../src/cli/check";

describe("CLI", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("migrate", () => {
    it("should migrate JSON files to TypeScript", async () => {
      // Create test JSON files
      const localesDir = path.join(tmpDir, "locales");
      fs.mkdirSync(localesDir);

      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify({ login: "Sign in", logout: "Sign out" }),
      );
      fs.writeFileSync(
        path.join(localesDir, "de.json"),
        JSON.stringify({ login: "Anmelden", logout: "Abmelden" }),
      );

      const outputPath = path.join(tmpDir, "translations.ts");

      // Run migrate
      await migrate(localesDir, outputPath);

      // Verify output
      expect(fs.existsSync(outputPath)).toBe(true);

      const content = fs.readFileSync(outputPath, "utf-8");
      expect(content).toContain("export const login");
      expect(content).toContain("export const logout");
      expect(content).toContain('en: "Sign in"');
      expect(content).toContain('de: "Anmelden"');
      expect(content).toContain("as const");
    });

    it("should escape special characters", async () => {
      const localesDir = path.join(tmpDir, "locales");
      fs.mkdirSync(localesDir);

      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify({ quote: 'Say "Hello"' }),
      );

      const outputPath = path.join(tmpDir, "translations.ts");
      await migrate(localesDir, outputPath);

      const content = fs.readFileSync(outputPath, "utf-8");
      expect(content).toContain('\\"Hello\\"');
    });
  });

  describe("check", () => {
    it("should detect missing translations", async () => {
      const localesDir = path.join(tmpDir, "locales");
      fs.mkdirSync(localesDir);

      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify({ login: "Sign in", logout: "Sign out" }),
      );
      fs.writeFileSync(
        path.join(localesDir, "de.json"),
        JSON.stringify({ login: "Anmelden" }), // missing logout
      );

      const result = await check(localesDir);

      expect(result.valid).toBe(false);
      expect(result.missing).toHaveLength(1);
      expect(result.missing[0].key).toBe("logout");
      expect(result.missing[0].missingIn).toContain("de");
    });

    it("should return valid when all translations exist", async () => {
      const localesDir = path.join(tmpDir, "locales");
      fs.mkdirSync(localesDir);

      fs.writeFileSync(
        path.join(localesDir, "en.json"),
        JSON.stringify({ login: "Sign in" }),
      );
      fs.writeFileSync(
        path.join(localesDir, "de.json"),
        JSON.stringify({ login: "Anmelden" }),
      );

      const result = await check(localesDir);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
    });
  });
});
