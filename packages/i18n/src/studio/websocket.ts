import { WebSocketServer, WebSocket } from "ws";
import type { Server } from "node:http";
import type { ParsedTranslations, TranslationEntry } from "./parser";

export interface WebSocketMessage {
  type: "sync" | "update" | "add" | "delete" | "error";
  data?: unknown;
  error?: string;
}

export interface TranslationUpdateMessage {
  type: "update";
  data: {
    key: string;
    locale: string;
    value: string;
  };
}

export interface TranslationAddMessage {
  type: "add";
  data: {
    key: string;
    translations: Record<string, string>;
  };
}

export interface TranslationDeleteMessage {
  type: "delete";
  data: {
    key: string;
  };
}

export interface TranslationSyncMessage {
  type: "sync";
  data: ParsedTranslations;
}

export interface StudioWebSocket {
  attach(server: Server): void;
  broadcast(message: WebSocketMessage): void;
  broadcastSync(translations: ParsedTranslations): void;
  close(): Promise<void>;
  getConnectionCount(): number;
}

export interface WebSocketHandlers {
  onUpdate?: (key: string, locale: string, value: string) => void;
  onAdd?: (key: string, translations: Record<string, string>) => void;
  onDelete?: (key: string) => void;
}

/**
 * Create a WebSocket handler for real-time sync.
 */
export function createStudioWebSocket(handlers: WebSocketHandlers = {}): StudioWebSocket {
  let wss: WebSocketServer | null = null;
  const clients = new Set<WebSocket>();

  return {
    attach(server: Server) {
      wss = new WebSocketServer({ server });

      wss.on("connection", (ws) => {
        clients.add(ws);

        ws.on("message", (rawData) => {
          try {
            const message = JSON.parse(rawData.toString()) as WebSocketMessage;
            handleMessage(ws, message, handlers);
          } catch (err) {
            sendError(ws, "Invalid message format");
          }
        });

        ws.on("close", () => {
          clients.delete(ws);
        });

        ws.on("error", () => {
          clients.delete(ws);
        });
      });
    },

    broadcast(message: WebSocketMessage) {
      const data = JSON.stringify(message);
      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(data);
        }
      }
    },

    broadcastSync(translations: ParsedTranslations) {
      this.broadcast({
        type: "sync",
        data: translations,
      });
    },

    async close() {
      return new Promise<void>((resolve) => {
        if (wss) {
          // Close all client connections
          for (const client of clients) {
            client.close();
          }
          clients.clear();

          wss.close(() => {
            wss = null;
            resolve();
          });
        } else {
          resolve();
        }
      });
    },

    getConnectionCount() {
      return clients.size;
    },
  };
}

function handleMessage(
  ws: WebSocket,
  message: WebSocketMessage,
  handlers: WebSocketHandlers,
): void {
  switch (message.type) {
    case "update": {
      const updateMsg = message as TranslationUpdateMessage;
      const { key, locale, value } = updateMsg.data;
      if (handlers.onUpdate) {
        try {
          handlers.onUpdate(key, locale, value);
        } catch (err) {
          sendError(ws, err instanceof Error ? err.message : "Update failed");
        }
      }
      break;
    }

    case "add": {
      const addMsg = message as TranslationAddMessage;
      const { key, translations } = addMsg.data;
      if (handlers.onAdd) {
        try {
          handlers.onAdd(key, translations);
        } catch (err) {
          sendError(ws, err instanceof Error ? err.message : "Add failed");
        }
      }
      break;
    }

    case "delete": {
      const deleteMsg = message as TranslationDeleteMessage;
      const { key } = deleteMsg.data;
      if (handlers.onDelete) {
        try {
          handlers.onDelete(key);
        } catch (err) {
          sendError(ws, err instanceof Error ? err.message : "Delete failed");
        }
      }
      break;
    }

    default:
      sendError(ws, `Unknown message type: ${message.type}`);
  }
}

function sendError(ws: WebSocket, error: string): void {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "error", error }));
  }
}
