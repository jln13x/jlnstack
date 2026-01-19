import { watch, type FSWatcher } from "chokidar";
import { parseTranslationFile, type ParsedTranslations } from "./parser";

export interface FileWatcherConfig {
  translationsPath: string;
  onChange: (translations: ParsedTranslations) => void;
  onError?: (error: Error) => void;
}

export interface FileWatcher {
  start(): Promise<void>;
  stop(): Promise<void>;
  isWatching(): boolean;
}

/**
 * Create a file watcher for translation files.
 *
 * Watches for external changes to the translation file and
 * notifies via callback when changes occur.
 */
export function createFileWatcher(config: FileWatcherConfig): FileWatcher {
  const { translationsPath, onChange, onError } = config;
  let watcher: FSWatcher | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let watching = false;

  // Debounce to handle rapid successive changes
  const debounceMs = 100;

  const handleChange = () => {
    // Clear existing timer
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    debounceTimer = setTimeout(() => {
      try {
        const translations = parseTranslationFile(translationsPath);
        onChange(translations);
      } catch (err) {
        if (onError && err instanceof Error) {
          onError(err);
        }
      }
    }, debounceMs);
  };

  return {
    async start() {
      if (watching) return;

      return new Promise((resolve, reject) => {
        watcher = watch(translationsPath, {
          persistent: true,
          ignoreInitial: true,
          awaitWriteFinish: {
            stabilityThreshold: 100,
            pollInterval: 50,
          },
        });

        watcher.on("ready", () => {
          watching = true;
          resolve();
        });

        watcher.on("change", handleChange);
        watcher.on("add", handleChange);

        watcher.on("error", (err) => {
          if (onError) {
            onError(err);
          }
          reject(err);
        });
      });
    },

    async stop() {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
        debounceTimer = null;
      }

      if (watcher) {
        await watcher.close();
        watcher = null;
        watching = false;
      }
    },

    isWatching() {
      return watching;
    },
  };
}
