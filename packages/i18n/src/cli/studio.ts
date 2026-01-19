import * as path from "node:path";
import {
  createStudioServer,
  createStudioWebSocket,
  createFileWatcher,
  parseTranslationFile,
  updateTranslation,
  addTranslationKey,
  deleteTranslationKey,
} from "../studio";

export interface StudioOptions {
  port: number;
  locales: string[];
}

/**
 * Launch the i18n Studio visual editor.
 */
export async function studio(
  translationsPath: string,
  options: StudioOptions,
): Promise<void> {
  const { port, locales } = options;
  const resolvedPath = path.resolve(process.cwd(), translationsPath);

  console.log("\n🚀 Starting i18n Studio...\n");
  console.log(`  📁 Translations: ${resolvedPath}`);
  console.log(`  🌍 Locales: ${locales.join(", ")}`);
  console.log(`  🔌 Port: ${port}\n`);

  // Helper to broadcast sync to all WebSocket clients
  function broadcastSync() {
    const translations = parseTranslationFile(resolvedPath);
    ws.broadcastSync(translations);
  }

  // Create WebSocket handlers for real-time sync
  const ws = createStudioWebSocket({
    onUpdate(key, locale, value) {
      updateTranslation(resolvedPath, key, locale, value);
      broadcastSync();
    },
    onAdd(key, translations) {
      addTranslationKey(resolvedPath, key, translations);
      broadcastSync();
    },
    onDelete(key) {
      deleteTranslationKey(resolvedPath, key);
      broadcastSync();
    },
  });

  // Create the HTTP server
  const server = createStudioServer({
    port,
    translationsPath: resolvedPath,
    locales,
  });

  // Start HTTP server first
  await server.start();

  // Attach WebSocket to the HTTP server
  const httpServer = server.getHttpServer();
  if (httpServer) {
    ws.attach(httpServer);
  }

  // Create file watcher for external changes
  const watcher = createFileWatcher({
    translationsPath: resolvedPath,
    onChange(translations) {
      console.log("  📝 External file change detected, syncing...");
      ws.broadcastSync(translations);
    },
    onError(err) {
      console.error("  ❌ File watcher error:", err.message);
    },
  });

  await watcher.start();
  console.log("  👀 Watching for file changes...");
  console.log("\n  Press Ctrl+C to stop\n");

  // Handle shutdown
  const shutdown = async () => {
    console.log("\n\n🛑 Shutting down i18n Studio...\n");
    await watcher.stop();
    await ws.close();
    await server.stop();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}
