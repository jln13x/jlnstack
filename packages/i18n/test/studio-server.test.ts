import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createStudioServer, type StudioServer } from "../src/studio/server";

describe("Studio Server", () => {
  let tmpDir: string;
  let server: StudioServer;
  let baseUrl: string;

  beforeEach(async () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-studio-server-"));
    const translationsPath = path.join(tmpDir, "translations.ts");

    // Create initial translations
    fs.writeFileSync(
      translationsPath,
      `export const hello = { en: "Hello", de: "Hallo" } as const;
export const goodbye = { en: "Goodbye", de: "Auf Wiedersehen" } as const;
`,
    );

    server = createStudioServer({
      port: 0, // Random available port
      translationsPath,
      locales: ["en", "de"],
    });

    await server.start();
    baseUrl = `http://localhost:${server.getPort()}`;
  });

  afterEach(async () => {
    await server.stop();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  describe("GET /api/translations", () => {
    it("should return all translations", async () => {
      const res = await fetch(`${baseUrl}/api/translations`);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.entries).toHaveLength(2);
      expect(json.data.locales).toEqual(["de", "en"]);
    });
  });

  describe("GET /api/locales", () => {
    it("should return configured locales", async () => {
      const res = await fetch(`${baseUrl}/api/locales`);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.locales).toEqual(["en", "de"]);
    });
  });

  describe("POST /api/translations", () => {
    it("should add a new translation key", async () => {
      const res = await fetch(`${baseUrl}/api/translations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "welcome",
          translations: { en: "Welcome", de: "Willkommen" },
        }),
      });

      const json = await res.json();

      expect(res.status).toBe(201);
      expect(json.success).toBe(true);
      expect(json.data.entries).toHaveLength(3);

      const welcome = json.data.entries.find(
        (e: { key: string }) => e.key === "welcome",
      );
      expect(welcome.translations.en).toBe("Welcome");
    });

    it("should reject duplicate key", async () => {
      const res = await fetch(`${baseUrl}/api/translations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "hello",
          translations: { en: "Hi" },
        }),
      });

      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("already exists");
    });

    it("should reject missing key", async () => {
      const res = await fetch(`${baseUrl}/api/translations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ translations: { en: "Hi" } }),
      });

      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.success).toBe(false);
      expect(json.error).toContain("Key is required");
    });
  });

  describe("PUT /api/translations/:key", () => {
    it("should update a translation", async () => {
      const res = await fetch(`${baseUrl}/api/translations/hello`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: "en", value: "Hi there" }),
      });

      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);

      const hello = json.data.entries.find(
        (e: { key: string }) => e.key === "hello",
      );
      expect(hello.translations.en).toBe("Hi there");
    });

    it("should handle URL-encoded keys", async () => {
      // First add a key with a special character
      await fetch(`${baseUrl}/api/translations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: "special_key",
          translations: { en: "Value" },
        }),
      });

      const res = await fetch(`${baseUrl}/api/translations/special_key`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: "en", value: "Updated" }),
      });

      const json = await res.json();
      expect(json.success).toBe(true);
    });
  });

  describe("DELETE /api/translations/:key", () => {
    it("should delete a translation key", async () => {
      const res = await fetch(`${baseUrl}/api/translations/hello`, {
        method: "DELETE",
      });

      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.entries).toHaveLength(1);
      expect(json.data.entries[0].key).toBe("goodbye");
    });

    it("should return 404 for non-existent key", async () => {
      const res = await fetch(`${baseUrl}/api/translations/nonexistent`, {
        method: "DELETE",
      });

      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });

  describe("POST /api/export", () => {
    it("should export to JSON", async () => {
      const res = await fetch(`${baseUrl}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "json" }),
      });

      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.en.hello).toBe("Hello");
      expect(json.data.de.hello).toBe("Hallo");
    });

    it("should export to CSV", async () => {
      const res = await fetch(`${baseUrl}/api/export`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "csv" }),
      });

      const text = await res.text();

      expect(res.status).toBe(200);
      expect(text).toContain("key,de,en");
      expect(text).toContain("hello,Hallo,Hello");
    });
  });

  describe("POST /api/import", () => {
    it("should import from JSON", async () => {
      const importData = {
        en: { new_key: "New Value" },
        de: { new_key: "Neuer Wert" },
      };

      const res = await fetch(`${baseUrl}/api/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "json", data: importData }),
      });

      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.entries).toHaveLength(1);
      expect(json.data.entries[0].key).toBe("new_key");
    });

    it("should import from CSV", async () => {
      const csv = "key,en,de\nimported,Imported,Importiert";

      const res = await fetch(`${baseUrl}/api/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ format: "csv", data: csv }),
      });

      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.data.entries[0].translations.en).toBe("Imported");
    });
  });

  describe("CORS", () => {
    it("should handle OPTIONS preflight", async () => {
      const res = await fetch(`${baseUrl}/api/translations`, {
        method: "OPTIONS",
      });

      expect(res.status).toBe(204);
      expect(res.headers.get("Access-Control-Allow-Origin")).toBe("*");
    });
  });

  describe("404", () => {
    it("should return 404 for unknown routes", async () => {
      const res = await fetch(`${baseUrl}/api/unknown`);
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.success).toBe(false);
    });
  });
});
