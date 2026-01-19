import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createStudioServer, type StudioServer } from "../src/studio/server";
import { generateStudioUI } from "../src/studio/ui";

describe("Studio UI", () => {
  describe("generateStudioUI", () => {
    it("should generate valid HTML", () => {
      const html = generateStudioUI(4200);

      expect(html).toContain("<!DOCTYPE html>");
      expect(html).toContain("i18n Studio");
      expect(html).toContain("ws://");
    });

    it("should include WebSocket port", () => {
      const html = generateStudioUI(5000);

      expect(html).toContain("5000");
    });

    it("should include search functionality", () => {
      const html = generateStudioUI(4200);

      expect(html).toContain('id="search"');
      expect(html).toContain("Search translations");
    });

    it("should include add key button", () => {
      const html = generateStudioUI(4200);

      expect(html).toContain('id="addBtn"');
      expect(html).toContain("Add Key");
    });

    it("should include connection status", () => {
      const html = generateStudioUI(4200);

      expect(html).toContain("statusDot");
      expect(html).toContain("Disconnected");
    });

    it("should include grid for translations", () => {
      const html = generateStudioUI(4200);

      expect(html).toContain('id="grid"');
      expect(html).toContain("grid-header");
      expect(html).toContain("grid-body");
    });

    it("should include stats in footer", () => {
      const html = generateStudioUI(4200);

      expect(html).toContain("totalKeys");
      expect(html).toContain("missingCount");
    });
  });

  describe("server UI serving", () => {
    let tmpDir: string;
    let server: StudioServer;
    let baseUrl: string;

    beforeEach(async () => {
      tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "i18n-ui-test-"));
      const translationsPath = path.join(tmpDir, "translations.ts");

      fs.writeFileSync(
        translationsPath,
        `export const hello = { en: "Hello" } as const;\n`,
      );

      server = createStudioServer({
        port: 0,
        translationsPath,
        locales: ["en"],
      });

      await server.start();
      baseUrl = `http://localhost:${server.getPort()}`;
    });

    afterEach(async () => {
      await server.stop();
      fs.rmSync(tmpDir, { recursive: true, force: true });
    });

    it("should serve UI at root path", async () => {
      const res = await fetch(baseUrl);
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(res.headers.get("content-type")).toContain("text/html");
      expect(html).toContain("i18n Studio");
    });

    it("should serve UI at /index.html", async () => {
      const res = await fetch(`${baseUrl}/index.html`);
      const html = await res.text();

      expect(res.status).toBe(200);
      expect(html).toContain("i18n Studio");
    });

    it("should include correct WebSocket port in UI", async () => {
      const res = await fetch(baseUrl);
      const html = await res.text();

      expect(html).toContain(`${server.getPort()}`);
    });
  });
});
