export {
  parseTranslationFile,
  parseTranslationContent,
  generateTranslationContent,
  writeTranslationFile,
  updateTranslation,
  addTranslationKey,
  deleteTranslationKey,
  type TranslationEntry,
  type ParsedTranslations,
} from "./parser";

export {
  createStudioServer,
  type StudioConfig,
  type StudioServer,
} from "./server";

export {
  createFileWatcher,
  type FileWatcher,
  type FileWatcherConfig,
} from "./watcher";

export {
  createStudioWebSocket,
  type StudioWebSocket,
  type WebSocketHandlers,
  type WebSocketMessage,
} from "./websocket";
