import { describe, expect, it, vi } from "vitest";
import { createNotificationHandlers } from "../src/server";
import type { NotificationManager } from "../src";

type TestTypes = {
  message: { from: string };
  alert: { severity: string };
};

function createMockManager(
  overrides: Partial<NotificationManager<TestTypes>> = {}
): NotificationManager<TestTypes> {
  return {
    send: vi.fn(),
    get: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    unreadCount: vi.fn().mockResolvedValue(0),
    markAsRead: vi.fn(),
    markManyAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    adapter: {} as never,
    types: {} as never,
    ...overrides,
  };
}

function createMockRequest(
  method: string,
  url: string,
  body?: unknown
): { method: string; url: string; json: () => Promise<unknown> } {
  return {
    method,
    url: `http://localhost${url}`,
    json: () => Promise.resolve(body),
  };
}

function createMockContext(
  path: string[] = []
): { params: Promise<{ path?: string[] }> } {
  return {
    params: Promise.resolve({ path }),
  };
}

describe("createNotificationHandlers", () => {
  describe("authentication", () => {
    it("should return 401 when getId throws", async () => {
      const manager = createMockManager();
      const handlers = createNotificationHandlers({
        manager,
        getId: () => {
          throw new Error("Unauthorized");
        },
      });

      const response = await handlers.GET(
        createMockRequest("GET", "/api/notifications"),
        createMockContext()
      );

      expect(response.status).toBe(401);
      const body = await response.json();
      expect(body).toEqual({ error: "Unauthorized" });
    });

    it("should pass authenticated userId to manager", async () => {
      const mockList = vi.fn().mockResolvedValue([]);
      const manager = createMockManager({ list: mockList });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      await handlers.GET(
        createMockRequest("GET", "/api/notifications"),
        createMockContext()
      );

      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user_123" })
      );
    });
  });

  describe("GET routes", () => {
    it("should list notifications", async () => {
      const notifications = [{ id: "1", userId: "user_123", type: "message" }];
      const mockList = vi.fn().mockResolvedValue(notifications);
      const manager = createMockManager({ list: mockList });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.GET(
        createMockRequest("GET", "/api/notifications"),
        createMockContext()
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ data: notifications });
    });

    it("should parse filter params", async () => {
      const mockList = vi.fn().mockResolvedValue([]);
      const manager = createMockManager({ list: mockList });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      await handlers.GET(
        createMockRequest(
          "GET",
          "/api/notifications?type=message&read=false&limit=10&offset=5"
        ),
        createMockContext()
      );

      expect(mockList).toHaveBeenCalledWith({
        userId: "user_123",
        type: "message",
        read: false,
        archived: undefined,
        limit: 10,
        offset: 5,
      });
    });

    it("should get count", async () => {
      const mockCount = vi.fn().mockResolvedValue(5);
      const manager = createMockManager({ count: mockCount });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.GET(
        createMockRequest("GET", "/api/notifications/count"),
        createMockContext(["count"])
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ count: 5 });
    });

    it("should get unread count", async () => {
      const mockUnreadCount = vi.fn().mockResolvedValue(3);
      const manager = createMockManager({ unreadCount: mockUnreadCount });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.GET(
        createMockRequest("GET", "/api/notifications/unread-count"),
        createMockContext(["unread-count"])
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ count: 3 });
    });

    it("should get single notification", async () => {
      const notification = { id: "notif_1", userId: "user_123", type: "message" };
      const mockGet = vi.fn().mockResolvedValue(notification);
      const manager = createMockManager({ get: mockGet });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.GET(
        createMockRequest("GET", "/api/notifications/notif_1"),
        createMockContext(["notif_1"])
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body).toEqual({ data: notification });
    });

    it("should return 404 for non-existent notification", async () => {
      const mockGet = vi.fn().mockResolvedValue(null);
      const manager = createMockManager({ get: mockGet });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.GET(
        createMockRequest("GET", "/api/notifications/notif_1"),
        createMockContext(["notif_1"])
      );

      expect(response.status).toBe(404);
    });

    it("should return 403 for notification belonging to another user", async () => {
      const notification = { id: "notif_1", userId: "other_user", type: "message" };
      const mockGet = vi.fn().mockResolvedValue(notification);
      const manager = createMockManager({ get: mockGet });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.GET(
        createMockRequest("GET", "/api/notifications/notif_1"),
        createMockContext(["notif_1"])
      );

      expect(response.status).toBe(403);
    });
  });

  describe("POST routes", () => {
    it("should send notification", async () => {
      const notification = {
        id: "notif_1",
        userId: "user_123",
        type: "message",
        title: "Test",
        data: { from: "john" },
      };
      const mockSend = vi.fn().mockResolvedValue(notification);
      const manager = createMockManager({ send: mockSend });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.POST(
        createMockRequest("POST", "/api/notifications/send", {
          type: "message",
          title: "Test",
          data: { from: "john" },
        }),
        createMockContext(["send"])
      );

      expect(response.status).toBe(201);
      expect(mockSend).toHaveBeenCalledWith("message", {
        userId: "user_123",
        title: "Test",
        body: undefined,
        data: { from: "john" },
      });
    });

    it("should return 400 when type or title missing", async () => {
      const manager = createMockManager();
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.POST(
        createMockRequest("POST", "/api/notifications/send", {
          data: { from: "john" },
        }),
        createMockContext(["send"])
      );

      expect(response.status).toBe(400);
    });

    it("should mark as read", async () => {
      const notification = { id: "notif_1", userId: "user_123", read: true };
      const mockGet = vi.fn().mockResolvedValue({ id: "notif_1", userId: "user_123" });
      const mockMarkAsRead = vi.fn().mockResolvedValue(notification);
      const manager = createMockManager({ get: mockGet, markAsRead: mockMarkAsRead });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.POST(
        createMockRequest("POST", "/api/notifications/notif_1/read", {}),
        createMockContext(["notif_1", "read"])
      );

      expect(response.status).toBe(200);
      expect(mockMarkAsRead).toHaveBeenCalledWith("notif_1");
    });

    it("should mark all as read", async () => {
      const mockMarkAllAsRead = vi.fn().mockResolvedValue(undefined);
      const manager = createMockManager({ markAllAsRead: mockMarkAllAsRead });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.POST(
        createMockRequest("POST", "/api/notifications/read-all", {}),
        createMockContext(["read-all"])
      );

      expect(response.status).toBe(200);
      expect(mockMarkAllAsRead).toHaveBeenCalledWith("user_123");
    });

    it("should archive notification", async () => {
      const notification = { id: "notif_1", userId: "user_123", archived: true };
      const mockGet = vi.fn().mockResolvedValue({ id: "notif_1", userId: "user_123" });
      const mockArchive = vi.fn().mockResolvedValue(notification);
      const manager = createMockManager({ get: mockGet, archive: mockArchive });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.POST(
        createMockRequest("POST", "/api/notifications/notif_1/archive", {}),
        createMockContext(["notif_1", "archive"])
      );

      expect(response.status).toBe(200);
      expect(mockArchive).toHaveBeenCalledWith("notif_1");
    });
  });

  describe("DELETE routes", () => {
    it("should delete notification", async () => {
      const mockGet = vi.fn().mockResolvedValue({ id: "notif_1", userId: "user_123" });
      const mockDelete = vi.fn().mockResolvedValue(true);
      const manager = createMockManager({ get: mockGet, delete: mockDelete });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.DELETE(
        createMockRequest("DELETE", "/api/notifications/notif_1"),
        createMockContext(["notif_1"])
      );

      expect(response.status).toBe(200);
      expect(mockDelete).toHaveBeenCalledWith("notif_1");
    });

    it("should return 403 when deleting another user's notification", async () => {
      const mockGet = vi.fn().mockResolvedValue({ id: "notif_1", userId: "other_user" });
      const manager = createMockManager({ get: mockGet });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
      });

      const response = await handlers.DELETE(
        createMockRequest("DELETE", "/api/notifications/notif_1"),
        createMockContext(["notif_1"])
      );

      expect(response.status).toBe(403);
    });
  });

  describe("transformer", () => {
    it("should use transformer for serialization", async () => {
      const notifications = [{ id: "1", type: "message" }];
      const mockList = vi.fn().mockResolvedValue(notifications);
      const manager = createMockManager({ list: mockList });
      const handlers = createNotificationHandlers({
        manager,
        getId: () => "user_123",
        transformer: {
          serialize: (data) => ({ transformed: true, original: data }),
          deserialize: (data) => data as never,
        },
      });

      const response = await handlers.GET(
        createMockRequest("GET", "/api/notifications"),
        createMockContext()
      );

      const body = await response.json();
      expect(body).toEqual({
        transformed: true,
        original: { data: notifications },
      });
    });
  });
});
