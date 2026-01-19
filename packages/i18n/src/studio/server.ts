import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  parseTranslationFile,
  writeTranslationFile,
  updateTranslation,
  addTranslationKey,
  deleteTranslationKey,
  type TranslationEntry,
} from "./parser";

export interface StudioConfig {
  port: number;
  translationsPath: string;
  locales: string[];
}

export interface StudioServer {
  start(): Promise<void>;
  stop(): Promise<void>;
  getPort(): number;
}

interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

/**
 * Create the Studio HTTP server.
 */
export function createStudioServer(config: StudioConfig): StudioServer {
  const { port, translationsPath, locales } = config;
  let server: http.Server | null = null;
  let actualPort = port;

  const resolvedPath = path.resolve(process.cwd(), translationsPath);

  // Ensure translations file exists
  if (!fs.existsSync(resolvedPath)) {
    writeTranslationFile(resolvedPath, [], locales);
  }

  const requestHandler: http.RequestListener = async (req, res) => {
    // Enable CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    res.setHeader("Content-Type", "application/json");

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url ?? "/", `http://localhost:${actualPort}`);
    const pathname = url.pathname;

    try {
      // GET /api/translations - list all translations
      if (req.method === "GET" && pathname === "/api/translations") {
        const parsed = parseTranslationFile(resolvedPath);
        sendJson(res, 200, { success: true, data: parsed });
        return;
      }

      // GET /api/locales - list configured locales
      if (req.method === "GET" && pathname === "/api/locales") {
        sendJson(res, 200, { success: true, data: { locales } });
        return;
      }

      // POST /api/translations - add new key
      if (req.method === "POST" && pathname === "/api/translations") {
        const body = await readBody(req);
        const { key, translations } = body as {
          key: string;
          translations: Record<string, string>;
        };

        if (!key) {
          sendJson(res, 400, { success: false, error: "Key is required" });
          return;
        }

        try {
          addTranslationKey(resolvedPath, key, translations ?? {});
          const parsed = parseTranslationFile(resolvedPath);
          sendJson(res, 201, { success: true, data: parsed });
        } catch (err) {
          sendJson(res, 400, {
            success: false,
            error: err instanceof Error ? err.message : "Failed to add key",
          });
        }
        return;
      }

      // PUT /api/translations/:key - update a translation
      const putMatch = pathname.match(/^\/api\/translations\/(.+)$/);
      if (req.method === "PUT" && putMatch) {
        const key = decodeURIComponent(putMatch[1] ?? "");
        const body = await readBody(req);
        const { locale, value } = body as { locale: string; value: string };

        if (!locale) {
          sendJson(res, 400, { success: false, error: "Locale is required" });
          return;
        }

        updateTranslation(resolvedPath, key, locale, value ?? "");
        const parsed = parseTranslationFile(resolvedPath);
        sendJson(res, 200, { success: true, data: parsed });
        return;
      }

      // DELETE /api/translations/:key - delete a key
      const deleteMatch = pathname.match(/^\/api\/translations\/(.+)$/);
      if (req.method === "DELETE" && deleteMatch) {
        const key = decodeURIComponent(deleteMatch[1] ?? "");

        try {
          deleteTranslationKey(resolvedPath, key);
          const parsed = parseTranslationFile(resolvedPath);
          sendJson(res, 200, { success: true, data: parsed });
        } catch (err) {
          sendJson(res, 404, {
            success: false,
            error: err instanceof Error ? err.message : "Key not found",
          });
        }
        return;
      }

      // POST /api/export - export translations
      if (req.method === "POST" && pathname === "/api/export") {
        const body = await readBody(req);
        const { format } = body as { format: "json" | "csv" };
        const parsed = parseTranslationFile(resolvedPath);

        if (format === "csv") {
          const csv = exportToCsv(parsed.entries, locales);
          res.setHeader("Content-Type", "text/csv");
          res.writeHead(200);
          res.end(csv);
        } else {
          const json = exportToJson(parsed.entries, locales);
          sendJson(res, 200, { success: true, data: json });
        }
        return;
      }

      // POST /api/import - import translations
      if (req.method === "POST" && pathname === "/api/import") {
        const body = await readBody(req);
        const { format, data } = body as {
          format: "json" | "csv";
          data: string | Record<string, Record<string, string>>;
        };

        let entries: TranslationEntry[];

        if (format === "csv" && typeof data === "string") {
          entries = importFromCsv(data, locales);
        } else if (format === "json" && typeof data === "object") {
          entries = importFromJson(data as Record<string, Record<string, string>>);
        } else {
          sendJson(res, 400, { success: false, error: "Invalid import format" });
          return;
        }

        writeTranslationFile(resolvedPath, entries, locales);
        const parsed = parseTranslationFile(resolvedPath);
        sendJson(res, 200, { success: true, data: parsed });
        return;
      }

      // 404 for unknown routes
      sendJson(res, 404, { success: false, error: "Not found" });
    } catch (err) {
      console.error("Server error:", err);
      sendJson(res, 500, {
        success: false,
        error: err instanceof Error ? err.message : "Internal server error",
      });
    }
  };

  return {
    async start() {
      return new Promise((resolve, reject) => {
        server = http.createServer(requestHandler);

        server.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            reject(new Error(`Port ${actualPort} is already in use`));
          } else {
            reject(err);
          }
        });

        server.listen(actualPort, () => {
          const addr = server?.address();
          if (addr && typeof addr === "object") {
            actualPort = addr.port;
          }
          console.log(`\n🌐 i18n Studio running at http://localhost:${actualPort}\n`);
          resolve();
        });
      });
    },

    async stop() {
      return new Promise((resolve) => {
        if (server) {
          server.close(() => {
            server = null;
            resolve();
          });
        } else {
          resolve();
        }
      });
    },

    getPort() {
      return actualPort;
    },
  };
}

// Helpers

function sendJson(res: http.ServerResponse, status: number, data: ApiResponse): void {
  res.writeHead(status);
  res.end(JSON.stringify(data));
}

async function readBody(req: http.IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk: Buffer) => chunks.push(chunk));
    req.on("end", () => {
      const body = Buffer.concat(chunks).toString();
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error("Invalid JSON body"));
      }
    });
    req.on("error", reject);
  });
}

function exportToCsv(entries: TranslationEntry[], locales: string[]): string {
  const sortedLocales = [...locales].sort();
  const header = ["key", ...sortedLocales].join(",");
  const rows = entries.map((entry) => {
    const values = sortedLocales.map((locale) => {
      const value = entry.translations[locale] ?? "";
      // Escape CSV values
      if (value.includes(",") || value.includes('"') || value.includes("\n")) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value;
    });
    return [entry.key, ...values].join(",");
  });
  return [header, ...rows].join("\n");
}

function exportToJson(
  entries: TranslationEntry[],
  locales: string[],
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {};
  for (const locale of locales) {
    result[locale] = {};
    for (const entry of entries) {
      result[locale][entry.key] = entry.translations[locale] ?? "";
    }
  }
  return result;
}

function importFromCsv(csv: string, locales: string[]): TranslationEntry[] {
  const lines = csv.split("\n").filter((line) => line.trim());
  if (lines.length === 0) return [];

  const header = lines[0]?.split(",") ?? [];
  const entries: TranslationEntry[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;

    const values = parseCsvLine(line);
    const key = values[0];
    if (!key) continue;

    const translations: Record<string, string> = {};
    for (let j = 1; j < header.length; j++) {
      const locale = header[j];
      if (locale && locales.includes(locale)) {
        translations[locale] = values[j] ?? "";
      }
    }

    entries.push({ key, translations });
  }

  return entries;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);

  return result;
}

function importFromJson(
  data: Record<string, Record<string, string>>,
): TranslationEntry[] {
  const entriesMap = new Map<string, Record<string, string>>();

  for (const [locale, translations] of Object.entries(data)) {
    for (const [key, value] of Object.entries(translations)) {
      const existing = entriesMap.get(key) ?? {};
      existing[locale] = value;
      entriesMap.set(key, existing);
    }
  }

  return Array.from(entriesMap.entries()).map(([key, translations]) => ({
    key,
    translations,
  }));
}
