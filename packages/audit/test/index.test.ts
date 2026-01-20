import { describe, it, expect, vi } from "vitest";
import { createAudit, type AuditAdapter, type AuditEntry } from "../src/index";
import { consoleAdapter } from "../src/adapters/console";
import { memoryAdapter } from "../src/adapters/memory";

describe("createAudit", () => {
  it("should call adapter.add with a complete entry", async () => {
    const addMock = vi.fn<[AuditEntry], Promise<void>>().mockResolvedValue(undefined);
    const adapter: AuditAdapter = { add: addMock };

    const audit = createAudit({
      adapter,
      actors: ["user", "system"] as const,
      events: {
        "user.created": {} as { userId: string; email: string },
      },
    });

    await audit.log({
      actor: { type: "user", id: "user_123" },
      event: {
        type: "user.created",
        data: { userId: "user_456", email: "test@example.com" },
      },
    });

    expect(addMock).toHaveBeenCalledOnce();
    const entry = addMock.mock.calls[0][0];
    expect(entry.actor).toEqual({ type: "user", id: "user_123" });
    expect(entry.event.type).toBe("user.created");
    expect(entry.event.data).toEqual({ userId: "user_456", email: "test@example.com" });
    expect(entry.id).toBeDefined();
    expect(entry.timestamp).toBeInstanceOf(Date);
  });

  it("should use provided id and timestamp if given", async () => {
    const addMock = vi.fn<[AuditEntry], Promise<void>>().mockResolvedValue(undefined);
    const adapter: AuditAdapter = { add: addMock };

    const audit = createAudit({
      adapter,
      actors: ["system"] as const,
      events: {
        "db.migrated": {} as { version: string },
      },
    });

    const customTimestamp = new Date("2024-01-01T00:00:00Z");

    await audit.log({
      id: "custom_id",
      timestamp: customTimestamp,
      actor: { type: "system", id: "migration-runner" },
      event: {
        type: "db.migrated",
        data: { version: "v2.0.0" },
      },
    });

    const entry = addMock.mock.calls[0][0];
    expect(entry.id).toBe("custom_id");
    expect(entry.timestamp).toBe(customTimestamp);
  });

  it("should use custom generateId function", async () => {
    const addMock = vi.fn<[AuditEntry], Promise<void>>().mockResolvedValue(undefined);
    const adapter: AuditAdapter = { add: addMock };

    let counter = 0;
    const audit = createAudit({
      adapter,
      actors: ["user"] as const,
      events: {
        "document.viewed": {} as { documentId: string },
      },
      generateId: () => `custom_${++counter}`,
    });

    await audit.log({
      actor: { type: "user", id: "user_1" },
      event: { type: "document.viewed", data: { documentId: "doc_1" } },
    });

    await audit.log({
      actor: { type: "user", id: "user_1" },
      event: { type: "document.viewed", data: { documentId: "doc_2" } },
    });

    expect(addMock.mock.calls[0][0].id).toBe("custom_1");
    expect(addMock.mock.calls[1][0].id).toBe("custom_2");
  });

  it("should include metadata and context", async () => {
    const addMock = vi.fn<[AuditEntry], Promise<void>>().mockResolvedValue(undefined);
    const adapter: AuditAdapter = { add: addMock };

    const audit = createAudit({
      adapter,
      actors: ["user"] as const,
      events: {
        "project.deleted": {} as { projectId: string; projectName: string },
      },
    });

    await audit.log({
      actor: { type: "user", id: "user_123", metadata: { role: "admin" } },
      event: {
        type: "project.deleted",
        data: { projectId: "proj_456", projectName: "My Project" },
      },
      metadata: { reason: "cleanup" },
      context: { ip: "192.168.1.1", userAgent: "Mozilla/5.0", requestId: "req_789" },
    });

    const entry = addMock.mock.calls[0][0];
    expect(entry.actor.metadata).toEqual({ role: "admin" });
    expect(entry.metadata).toEqual({ reason: "cleanup" });
    expect(entry.context).toEqual({
      ip: "192.168.1.1",
      userAgent: "Mozilla/5.0",
      requestId: "req_789",
    });
  });

  it("should return the created entry", async () => {
    const addMock = vi.fn<[AuditEntry], Promise<void>>().mockResolvedValue(undefined);
    const adapter: AuditAdapter = { add: addMock };

    const audit = createAudit({
      adapter,
      actors: ["user"] as const,
      events: {
        "user.created": {} as { userId: string; email: string },
      },
    });

    const entry = await audit.log({
      actor: { type: "user", id: "user_123" },
      event: {
        type: "user.created",
        data: { userId: "user_456", email: "test@example.com" },
      },
    });

    expect(entry).toEqual(addMock.mock.calls[0][0]);
  });
});

describe("consoleAdapter", () => {
  it("should log to console with default prefix", async () => {
    const logMock = vi.fn();
    const adapter = consoleAdapter({ logger: { log: logMock } });

    await adapter.add({
      id: "entry_1",
      timestamp: new Date("2024-01-01T00:00:00Z"),
      actor: { type: "user", id: "user_123" },
      event: { type: "user.created", data: { userId: "user_456", email: "test@example.com" } },
    });

    expect(logMock).toHaveBeenCalledOnce();
    expect(logMock.mock.calls[0][0]).toBe("[audit] user.created by user:user_123");
  });

  it("should use custom prefix", async () => {
    const logMock = vi.fn();
    const adapter = consoleAdapter({ prefix: "[AUDIT]", logger: { log: logMock } });

    await adapter.add({
      id: "entry_1",
      timestamp: new Date("2024-01-01T00:00:00Z"),
      actor: { type: "cron", id: "daily-cleanup" },
      event: { type: "cache.cleared", data: { cacheId: "main" } },
    });

    expect(logMock.mock.calls[0][0]).toBe("[AUDIT] cache.cleared by cron:daily-cleanup");
  });
});

describe("beforeLog hook", () => {
  it("should call beforeLog before adapter.add", async () => {
    const addMock = vi.fn<[AuditEntry], Promise<void>>().mockResolvedValue(undefined);
    const adapter: AuditAdapter = { add: addMock };

    const audit = createAudit({
      adapter,
      actors: ["user"] as const,
      events: {
        "project.created": {} as { projectId: string },
      },
      beforeLog: (entry) => ({
        ...entry,
        metadata: { ...entry.metadata, enriched: true },
      }),
    });

    await audit.log({
      actor: { type: "user", id: "user_123" },
      event: { type: "project.created", data: { projectId: "proj_456" } },
      metadata: { original: true },
    });

    const entry = addMock.mock.calls[0][0];
    expect(entry.metadata).toEqual({ original: true, enriched: true });
  });

  it("should support async beforeLog", async () => {
    const addMock = vi.fn<[AuditEntry], Promise<void>>().mockResolvedValue(undefined);
    const adapter: AuditAdapter = { add: addMock };

    const audit = createAudit({
      adapter,
      actors: ["user"] as const,
      events: {
        "user.logged_in": {} as { userId: string },
      },
      beforeLog: async (entry) => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return {
          ...entry,
          event: { ...entry.event, type: `async_${entry.event.type}` },
        };
      },
    });

    await audit.log({
      actor: { type: "user", id: "user_123" },
      event: { type: "user.logged_in", data: { userId: "user_123" } },
    });

    const entry = addMock.mock.calls[0][0];
    expect(entry.event.type).toBe("async_user.logged_in");
  });

  it("can be used for redaction", async () => {
    const addMock = vi.fn<[AuditEntry], Promise<void>>().mockResolvedValue(undefined);
    const adapter: AuditAdapter = { add: addMock };

    const audit = createAudit({
      adapter,
      actors: ["user"] as const,
      events: {
        "session.started": {} as { sessionId: string },
      },
      beforeLog: (entry) => ({
        ...entry,
        context: entry.context
          ? { ...entry.context, ip: entry.context.ip ? "REDACTED" : undefined }
          : undefined,
      }),
    });

    await audit.log({
      actor: { type: "user", id: "user_123" },
      event: { type: "session.started", data: { sessionId: "sess_1" } },
      context: { ip: "192.168.1.1", userAgent: "Mozilla/5.0" },
    });

    const entry = addMock.mock.calls[0][0];
    expect(entry.context?.ip).toBe("REDACTED");
    expect(entry.context?.userAgent).toBe("Mozilla/5.0");
  });
});

describe("memoryAdapter", () => {
  it("should store entries in memory", async () => {
    const adapter = memoryAdapter();

    await adapter.add({
      id: "entry_1",
      timestamp: new Date(),
      actor: { type: "user", id: "user_123" },
      event: { type: "project.created", data: { projectId: "proj_1" } },
    });

    await adapter.add({
      id: "entry_2",
      timestamp: new Date(),
      actor: { type: "user", id: "user_123" },
      event: { type: "project.updated", data: { projectId: "proj_1" } },
    });

    expect(adapter.entries).toHaveLength(2);
    expect(adapter.entries[0].id).toBe("entry_1");
    expect(adapter.entries[1].id).toBe("entry_2");
  });

  it("should clear entries", async () => {
    const adapter = memoryAdapter();

    await adapter.add({
      id: "entry_1",
      timestamp: new Date(),
      actor: { type: "user", id: "user_123" },
      event: { type: "project.created", data: { projectId: "proj_1" } },
    });

    expect(adapter.entries).toHaveLength(1);

    adapter.clear();

    expect(adapter.entries).toHaveLength(0);
  });

  it("works with createAudit", async () => {
    const adapter = memoryAdapter();
    const audit = createAudit({
      adapter,
      actors: ["user"] as const,
      events: {
        "project.created": {} as { projectId: string; name: string },
      },
    });

    await audit.log({
      actor: { type: "user", id: "user_123" },
      event: { type: "project.created", data: { projectId: "proj_456", name: "Test" } },
    });

    expect(adapter.entries).toHaveLength(1);
    expect(adapter.entries[0].event.type).toBe("project.created");
  });
});

describe("typed events and actors", () => {
  it("should work with multiple actors and events", async () => {
    const adapter = memoryAdapter();

    const audit = createAudit({
      adapter,
      actors: ["user", "api_key", "cron", "webhook"] as const,
      events: {
        "user.created": {} as { userId: string; email: string; name: string },
        "user.deleted": {} as { userId: string; reason?: string },
        "subscription.renewed": {} as { subscriptionId: string; planId: string },
        "report.generated": {} as { reportId: string; format: string },
      },
    });

    // Log with user actor
    await audit.log({
      actor: { type: "user", id: "admin_1" },
      event: {
        type: "user.created",
        data: { userId: "user_456", email: "test@example.com", name: "Test User" },
      },
    });

    // Log with api_key actor
    await audit.log({
      actor: { type: "api_key", id: "key_prod_123" },
      event: {
        type: "user.deleted",
        data: { userId: "user_456", reason: "requested by user" },
      },
    });

    // Log with webhook actor
    await audit.log({
      actor: { type: "webhook", id: "stripe-invoice-paid" },
      event: {
        type: "subscription.renewed",
        data: { subscriptionId: "sub_123", planId: "plan_pro" },
      },
    });

    // Log with cron actor
    await audit.log({
      actor: { type: "cron", id: "daily-report-generator" },
      event: {
        type: "report.generated",
        data: { reportId: "report_789", format: "pdf" },
      },
    });

    expect(adapter.entries).toHaveLength(4);
    expect(adapter.entries[0].actor.type).toBe("user");
    expect(adapter.entries[1].actor.type).toBe("api_key");
    expect(adapter.entries[2].actor.type).toBe("webhook");
    expect(adapter.entries[3].actor.type).toBe("cron");
  });
});
