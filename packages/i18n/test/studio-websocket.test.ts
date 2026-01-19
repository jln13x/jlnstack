import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import * as http from "node:http";
import WebSocket from "ws";
import {
  createStudioWebSocket,
  type StudioWebSocket,
  type WebSocketMessage,
} from "../src/studio/websocket";

describe("Studio WebSocket", () => {
  let server: http.Server;
  let studioWs: StudioWebSocket;
  let port: number;

  beforeEach(async () => {
    server = http.createServer();
    studioWs = createStudioWebSocket();
    studioWs.attach(server);

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 0;
        resolve();
      });
    });
  });

  afterEach(async () => {
    await studioWs.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  function connectClient(): Promise<WebSocket> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(`ws://localhost:${port}`);
      ws.on("open", () => resolve(ws));
      ws.on("error", reject);
    });
  }

  function waitForMessage(ws: WebSocket): Promise<WebSocketMessage> {
    return new Promise((resolve) => {
      ws.once("message", (data) => {
        resolve(JSON.parse(data.toString()));
      });
    });
  }

  describe("connection", () => {
    it("should accept client connections", async () => {
      const client = await connectClient();
      expect(studioWs.getConnectionCount()).toBe(1);
      client.close();
    });

    it("should track multiple connections", async () => {
      const client1 = await connectClient();
      const client2 = await connectClient();

      expect(studioWs.getConnectionCount()).toBe(2);

      client1.close();
      client2.close();
    });

    it("should remove disconnected clients", async () => {
      const client = await connectClient();
      expect(studioWs.getConnectionCount()).toBe(1);

      client.close();

      // Wait for close event to propagate
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(studioWs.getConnectionCount()).toBe(0);
    });
  });

  describe("broadcast", () => {
    it("should broadcast messages to all clients", async () => {
      const client1 = await connectClient();
      const client2 = await connectClient();

      const promise1 = waitForMessage(client1);
      const promise2 = waitForMessage(client2);

      studioWs.broadcast({ type: "sync", data: { entries: [], locales: [] } });

      const [msg1, msg2] = await Promise.all([promise1, promise2]);

      expect(msg1.type).toBe("sync");
      expect(msg2.type).toBe("sync");

      client1.close();
      client2.close();
    });

    it("should broadcast sync messages", async () => {
      const client = await connectClient();
      const promise = waitForMessage(client);

      studioWs.broadcastSync({
        entries: [{ key: "hello", translations: { en: "Hello" } }],
        locales: ["en"],
      });

      const msg = await promise;
      expect(msg.type).toBe("sync");
      expect((msg.data as { entries: unknown[] }).entries).toHaveLength(1);

      client.close();
    });
  });

  describe("message handling", () => {
    it("should handle update messages", async () => {
      const onUpdate = vi.fn();
      await studioWs.close();

      studioWs = createStudioWebSocket({ onUpdate });
      studioWs.attach(server);

      const client = await connectClient();

      client.send(
        JSON.stringify({
          type: "update",
          data: { key: "hello", locale: "en", value: "Hi" },
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onUpdate).toHaveBeenCalledWith("hello", "en", "Hi");

      client.close();
    });

    it("should handle add messages", async () => {
      const onAdd = vi.fn();
      await studioWs.close();

      studioWs = createStudioWebSocket({ onAdd });
      studioWs.attach(server);

      const client = await connectClient();

      client.send(
        JSON.stringify({
          type: "add",
          data: { key: "newKey", translations: { en: "New", de: "Neu" } },
        }),
      );

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onAdd).toHaveBeenCalledWith("newKey", { en: "New", de: "Neu" });

      client.close();
    });

    it("should handle delete messages", async () => {
      const onDelete = vi.fn();
      await studioWs.close();

      studioWs = createStudioWebSocket({ onDelete });
      studioWs.attach(server);

      const client = await connectClient();

      client.send(JSON.stringify({ type: "delete", data: { key: "hello" } }));

      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(onDelete).toHaveBeenCalledWith("hello");

      client.close();
    });

    it("should send error for invalid messages", async () => {
      const client = await connectClient();
      const promise = waitForMessage(client);

      client.send("not json");

      const msg = await promise;
      expect(msg.type).toBe("error");
      expect(msg.error).toContain("Invalid");

      client.close();
    });

    it("should send error for unknown message types", async () => {
      const client = await connectClient();
      const promise = waitForMessage(client);

      client.send(JSON.stringify({ type: "unknown" }));

      const msg = await promise;
      expect(msg.type).toBe("error");
      expect(msg.error).toContain("Unknown message type");

      client.close();
    });

    it("should send error when handler throws", async () => {
      const onUpdate = vi.fn(() => {
        throw new Error("Handler error");
      });
      await studioWs.close();

      studioWs = createStudioWebSocket({ onUpdate });
      studioWs.attach(server);

      const client = await connectClient();
      const promise = waitForMessage(client);

      client.send(
        JSON.stringify({
          type: "update",
          data: { key: "hello", locale: "en", value: "Hi" },
        }),
      );

      const msg = await promise;
      expect(msg.type).toBe("error");
      expect(msg.error).toBe("Handler error");

      client.close();
    });
  });

  describe("close", () => {
    it("should close all connections", async () => {
      const client1 = await connectClient();
      const client2 = await connectClient();

      const closePromises = [
        new Promise<void>((resolve) => client1.on("close", () => resolve())),
        new Promise<void>((resolve) => client2.on("close", () => resolve())),
      ];

      await studioWs.close();
      await Promise.all(closePromises);

      expect(studioWs.getConnectionCount()).toBe(0);
    });
  });
});
