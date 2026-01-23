import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createMemoryAdapter, createNotificationManager } from "../src";

describe("createNotificationManager with Standard Schema (zod)", () => {
  // Define notification types using zod schemas
  const messageSchema = z.object({
    from: z.string(),
    preview: z.string(),
  });

  const alertSchema = z.object({
    severity: z.enum(["info", "warning", "error"]),
  });

  const systemSchema = z.object({});

  function createManager() {
    return createNotificationManager({
      types: {
        message: messageSchema,
        alert: alertSchema,
        system: systemSchema,
      },
      adapter: createMemoryAdapter(),
    });
  }

  it("should send and retrieve a notification with inferred types", async () => {
    const manager = createManager();

    const notification = await manager.send("message", {
      userId: "user_123",
      title: "New message",
      data: { from: "john", preview: "Hey there!" },
    });

    expect(notification.id).toBeDefined();
    expect(notification.type).toBe("message");
    expect(notification.userId).toBe("user_123");
    expect(notification.title).toBe("New message");
    expect(notification.data.from).toBe("john");
    expect(notification.data.preview).toBe("Hey there!");
    expect(notification.read).toBe(false);
    expect(notification.archived).toBe(false);
    expect(notification.createdAt).toBeInstanceOf(Date);
  });

  it("should support different notification types", async () => {
    const manager = createManager();

    const message = await manager.send("message", {
      userId: "user_123",
      title: "New message",
      data: { from: "john", preview: "Hey!" },
    });

    const alert = await manager.send("alert", {
      userId: "user_123",
      title: "Warning",
      data: { severity: "warning" },
    });

    const system = await manager.send("system", {
      userId: "user_123",
      title: "System update",
      data: {},
    });

    expect(message.type).toBe("message");
    expect(message.data.from).toBe("john");

    expect(alert.type).toBe("alert");
    expect(alert.data.severity).toBe("warning");

    expect(system.type).toBe("system");
  });

  it("should list notifications", async () => {
    const manager = createManager();

    await manager.send("message", {
      userId: "user_123",
      title: "Message 1",
      data: { from: "john", preview: "Hey!" },
    });

    await manager.send("alert", {
      userId: "user_123",
      title: "Alert 1",
      data: { severity: "warning" },
    });

    await manager.send("message", {
      userId: "user_456",
      title: "Message 2",
      data: { from: "jane", preview: "Hello!" },
    });

    const allNotifications = await manager.list();
    expect(allNotifications).toHaveLength(3);

    const user123Notifications = await manager.list({ userId: "user_123" });
    expect(user123Notifications).toHaveLength(2);

    // Type-safe filtering by notification type
    const messageNotifications = await manager.list({ type: "message" });
    expect(messageNotifications).toHaveLength(2);
  });

  it("should mark as read", async () => {
    const manager = createManager();

    const notification = await manager.send("message", {
      userId: "user_123",
      title: "Test",
      data: { from: "john", preview: "Hey!" },
    });

    expect(notification.read).toBe(false);
    expect(notification.readAt).toBeUndefined();

    const updated = await manager.markAsRead(notification.id);

    expect(updated?.read).toBe(true);
    expect(updated?.readAt).toBeInstanceOf(Date);
  });

  it("should mark all as read for a user", async () => {
    const manager = createManager();

    await manager.send("message", {
      userId: "user_123",
      title: "Message 1",
      data: { from: "john", preview: "Hey!" },
    });

    await manager.send("alert", {
      userId: "user_123",
      title: "Alert 1",
      data: { severity: "info" },
    });

    await manager.send("message", {
      userId: "user_456",
      title: "Message 2",
      data: { from: "jane", preview: "Hello!" },
    });

    const unreadBefore = await manager.unreadCount("user_123");
    expect(unreadBefore).toBe(2);

    await manager.markAllAsRead("user_123");

    const unreadAfter = await manager.unreadCount("user_123");
    expect(unreadAfter).toBe(0);

    // Other user should still have unread
    const otherUserUnread = await manager.unreadCount("user_456");
    expect(otherUserUnread).toBe(1);
  });

  it("should archive and unarchive", async () => {
    const manager = createManager();

    const notification = await manager.send("system", {
      userId: "user_123",
      title: "System notification",
      data: {},
    });

    expect(notification.archived).toBe(false);

    const archived = await manager.archive(notification.id);
    expect(archived?.archived).toBe(true);

    const unarchived = await manager.unarchive(notification.id);
    expect(unarchived?.archived).toBe(false);
  });

  it("should delete notifications", async () => {
    const manager = createManager();

    const notification = await manager.send("message", {
      userId: "user_123",
      title: "To delete",
      data: { from: "john", preview: "..." },
    });

    const found = await manager.get(notification.id);
    expect(found).not.toBeNull();

    const deleted = await manager.delete(notification.id);
    expect(deleted).toBe(true);

    const notFound = await manager.get(notification.id);
    expect(notFound).toBeNull();
  });

  it("should count unread notifications", async () => {
    const manager = createManager();

    await manager.send("message", {
      userId: "user_123",
      title: "Message 1",
      data: { from: "john", preview: "Hey!" },
    });

    await manager.send("message", {
      userId: "user_123",
      title: "Message 2",
      data: { from: "jane", preview: "Hi!" },
    });

    const count = await manager.unreadCount("user_123");
    expect(count).toBe(2);
  });

  it("should filter by read status", async () => {
    const manager = createManager();

    const n1 = await manager.send("message", {
      userId: "user_123",
      title: "Message 1",
      data: { from: "john", preview: "Hey!" },
    });

    await manager.send("message", {
      userId: "user_123",
      title: "Message 2",
      data: { from: "jane", preview: "Hi!" },
    });

    await manager.markAsRead(n1.id);

    const unread = await manager.list({ userId: "user_123", read: false });
    expect(unread).toHaveLength(1);
    expect(unread[0]?.title).toBe("Message 2");

    const read = await manager.list({ userId: "user_123", read: true });
    expect(read).toHaveLength(1);
    expect(read[0]?.title).toBe("Message 1");
  });

  it("should support pagination", async () => {
    const manager = createManager();

    for (let i = 0; i < 10; i++) {
      await manager.send("message", {
        userId: "user_123",
        title: `Message ${i}`,
        data: { from: "john", preview: `Content ${i}` },
      });
    }

    const page1 = await manager.list({ userId: "user_123", limit: 3 });
    expect(page1).toHaveLength(3);

    const page2 = await manager.list({
      userId: "user_123",
      limit: 3,
      offset: 3,
    });
    expect(page2).toHaveLength(3);

    // Verify no overlap between pages
    const page1Ids = page1.map((n) => n.id);
    const page2Ids = page2.map((n) => n.id);
    expect(page1Ids.some((id) => page2Ids.includes(id))).toBe(false);
  });

  it("should delete many notifications", async () => {
    const manager = createManager();

    await manager.send("message", {
      userId: "user_123",
      title: "Message 1",
      data: { from: "john", preview: "Hey!" },
    });

    await manager.send("alert", {
      userId: "user_123",
      title: "Alert 1",
      data: { severity: "error" },
    });

    await manager.send("message", {
      userId: "user_456",
      title: "Message 2",
      data: { from: "jane", preview: "Hi!" },
    });

    const deletedCount = await manager.deleteMany({ userId: "user_123" });
    expect(deletedCount).toBe(2);

    const remaining = await manager.list();
    expect(remaining).toHaveLength(1);
    expect(remaining[0]?.userId).toBe("user_456");
  });

  it("should expose the types object", async () => {
    const manager = createManager();

    expect(manager.types).toBeDefined();
    expect(manager.types.message).toBe(messageSchema);
    expect(manager.types.alert).toBe(alertSchema);
    expect(manager.types.system).toBe(systemSchema);
  });
});

describe("createNotificationManager with plain types (no schema)", () => {
  it("should work with plain object types", async () => {
    // Define types as plain objects (not Standard Schema)
    type MessageData = { from: string; preview: string };
    type AlertData = { severity: "info" | "warning" | "error" };

    const manager = createNotificationManager({
      types: {
        message: {} as MessageData,
        alert: {} as AlertData,
      },
      adapter: createMemoryAdapter(),
    });

    const notification = await manager.send("message", {
      userId: "user_123",
      title: "Test",
      data: { from: "john", preview: "Hey!" },
    });

    expect(notification.type).toBe("message");
    expect(notification.data.from).toBe("john");
  });
});

describe("onSend hook", () => {
  it("should call onSend hook after sending a notification", async () => {
    const sentNotifications: unknown[] = [];

    const manager = createNotificationManager({
      types: {
        message: z.object({ from: z.string() }),
      },
      adapter: createMemoryAdapter(),
      onSend: (notification) => {
        sentNotifications.push(notification);
      },
    });

    await manager.send("message", {
      userId: "user_123",
      title: "Test",
      data: { from: "john" },
    });

    expect(sentNotifications).toHaveLength(1);
    expect(sentNotifications[0]).toMatchObject({
      type: "message",
      userId: "user_123",
      title: "Test",
      data: { from: "john" },
    });
  });

  it("should support async onSend hook", async () => {
    let hookCalled = false;

    const manager = createNotificationManager({
      types: {
        alert: z.object({ severity: z.string() }),
      },
      adapter: createMemoryAdapter(),
      onSend: async (_notification) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        hookCalled = true;
      },
    });

    await manager.send("alert", {
      userId: "user_123",
      title: "Test",
      data: { severity: "warning" },
    });

    expect(hookCalled).toBe(true);
  });

  it("should have access to full notification in onSend", async () => {
    let receivedNotification: unknown;

    const manager = createNotificationManager({
      types: {
        message: z.object({ from: z.string() }),
      },
      adapter: createMemoryAdapter(),
      onSend: (notification) => {
        receivedNotification = notification;
      },
    });

    await manager.send("message", {
      userId: "user_123",
      title: "Test",
      body: "Test body",
      data: { from: "john" },
    });

    expect(receivedNotification).toMatchObject({
      id: expect.any(String),
      userId: "user_123",
      type: "message",
      title: "Test",
      body: "Test body",
      data: { from: "john" },
      read: false,
      archived: false,
      createdAt: expect.any(Date),
    });
  });
});
