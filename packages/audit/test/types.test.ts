import { describe, it, expectTypeOf } from "vitest";
import { createAudit, type AuditEntry } from "../src/index";
import { memoryAdapter } from "../src/adapters/memory";

describe("type tests", () => {
  describe("actor types", () => {
    it("should type actor.type based on actors array", () => {
      const audit = createAudit({
        adapter: memoryAdapter(),
        actors: ["user", "api_key", "cron"] as const,
        events: {
          "test.event": {} as { value: string },
        },
      });

      // This should compile - "user" is in the actors array
      audit.log({
        actor: { type: "user", id: "123" },
        event: { type: "test.event", data: { value: "test" } },
      });

      // This should compile - "api_key" is in the actors array
      audit.log({
        actor: { type: "api_key", id: "key_123" },
        event: { type: "test.event", data: { value: "test" } },
      });

      // Type test: actor.type should be "user" | "api_key" | "cron"
      type ActorType = Parameters<typeof audit.log>[0]["actor"]["type"];
      expectTypeOf<ActorType>().toEqualTypeOf<"user" | "api_key" | "cron">();
    });
  });

  describe("event types", () => {
    it("should type event.type based on events object keys", () => {
      const audit = createAudit({
        adapter: memoryAdapter(),
        actors: ["user"] as const,
        events: {
          "user.created": {} as { userId: string; email: string },
          "user.deleted": {} as { userId: string; reason?: string },
          "project.created": {} as { projectId: string; name: string },
        },
      });

      // This should compile - "user.created" is a valid event
      audit.log({
        actor: { type: "user", id: "123" },
        event: {
          type: "user.created",
          data: { userId: "456", email: "test@example.com" },
        },
      });

      // Type test: verify event types
      type EventInput = Parameters<typeof audit.log>[0]["event"];
      expectTypeOf<EventInput["type"]>().toEqualTypeOf<
        "user.created" | "user.deleted" | "project.created"
      >();
    });

    it("should type event.data based on event.type", () => {
      const audit = createAudit({
        adapter: memoryAdapter(),
        actors: ["user"] as const,
        events: {
          "user.created": {} as { userId: string; email: string },
          "user.deleted": {} as { userId: string; reason?: string },
        },
      });

      // user.created requires userId and email
      audit.log({
        actor: { type: "user", id: "123" },
        event: {
          type: "user.created",
          data: { userId: "456", email: "test@example.com" },
        },
      });

      // user.deleted requires userId, reason is optional
      audit.log({
        actor: { type: "user", id: "123" },
        event: {
          type: "user.deleted",
          data: { userId: "456" },
        },
      });

      audit.log({
        actor: { type: "user", id: "123" },
        event: {
          type: "user.deleted",
          data: { userId: "456", reason: "requested by user" },
        },
      });
    });
  });

  describe("return type", () => {
    it("should return typed AuditEntry", async () => {
      const audit = createAudit({
        adapter: memoryAdapter(),
        actors: ["user", "system"] as const,
        events: {
          "user.created": {} as { userId: string; email: string },
        },
      });

      const entry = await audit.log({
        actor: { type: "user", id: "123" },
        event: {
          type: "user.created",
          data: { userId: "456", email: "test@example.com" },
        },
      });

      // Entry should have correct types
      expectTypeOf(entry.actor.type).toEqualTypeOf<"user" | "system">();
      expectTypeOf(entry.event.type).toEqualTypeOf<"user.created">();
      expectTypeOf(entry.event.data).toEqualTypeOf<{ userId: string; email: string }>();
      expectTypeOf(entry.id).toEqualTypeOf<string>();
      expectTypeOf(entry.timestamp).toEqualTypeOf<Date>();
    });
  });

  describe("metadata and context", () => {
    it("should allow optional metadata and context", () => {
      const audit = createAudit({
        adapter: memoryAdapter(),
        actors: ["user"] as const,
        events: {
          "test.event": {} as { value: string },
        },
      });

      // Without metadata and context
      audit.log({
        actor: { type: "user", id: "123" },
        event: { type: "test.event", data: { value: "test" } },
      });

      // With metadata
      audit.log({
        actor: { type: "user", id: "123" },
        event: { type: "test.event", data: { value: "test" } },
        metadata: { extra: "info" },
      });

      // With context
      audit.log({
        actor: { type: "user", id: "123" },
        event: { type: "test.event", data: { value: "test" } },
        context: { ip: "1.2.3.4", userAgent: "Mozilla" },
      });

      // With both
      audit.log({
        actor: { type: "user", id: "123" },
        event: { type: "test.event", data: { value: "test" } },
        metadata: { extra: "info" },
        context: { ip: "1.2.3.4" },
      });
    });

    it("should allow actor metadata", () => {
      const audit = createAudit({
        adapter: memoryAdapter(),
        actors: ["user"] as const,
        events: {
          "test.event": {} as { value: string },
        },
      });

      audit.log({
        actor: { type: "user", id: "123", metadata: { role: "admin" } },
        event: { type: "test.event", data: { value: "test" } },
      });
    });
  });

  describe("custom id and timestamp", () => {
    it("should allow optional id and timestamp", () => {
      const audit = createAudit({
        adapter: memoryAdapter(),
        actors: ["user"] as const,
        events: {
          "test.event": {} as { value: string },
        },
      });

      // With custom id
      audit.log({
        id: "custom_id",
        actor: { type: "user", id: "123" },
        event: { type: "test.event", data: { value: "test" } },
      });

      // With custom timestamp
      audit.log({
        timestamp: new Date(),
        actor: { type: "user", id: "123" },
        event: { type: "test.event", data: { value: "test" } },
      });

      // With both
      audit.log({
        id: "custom_id",
        timestamp: new Date(),
        actor: { type: "user", id: "123" },
        event: { type: "test.event", data: { value: "test" } },
      });
    });
  });
});
