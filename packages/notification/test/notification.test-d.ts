import { describe, expectTypeOf, it } from "vitest";
import { z } from "zod";
import {
  createMemoryAdapter,
  createNotificationManager,
  type InferNotificationTypes,
  type NotificationFilter,
  type StandardSchemaV1,
} from "../src";

describe("createNotificationManager type inference", () => {
  it("should create manager with zod schemas", () => {
    const manager = createNotificationManager({
      types: {
        message: z.object({ from: z.string(), preview: z.string() }),
        alert: z.object({ severity: z.enum(["info", "warning", "error"]) }),
      },
      adapter: createMemoryAdapter(),
    });

    // Manager should be defined and have send method
    expectTypeOf(manager.send).toBeFunction();
    expectTypeOf(manager.list).toBeFunction();
    expectTypeOf(manager.markAsRead).toBeFunction();
  });

  it("should infer data type for send() based on notification type", async () => {
    const manager = createNotificationManager({
      types: {
        message: z.object({ from: z.string(), preview: z.string() }),
        alert: z.object({ severity: z.enum(["info", "warning", "error"]) }),
      },
      adapter: createMemoryAdapter(),
    });

    // When sending "message", data should have from and preview
    const messageResult = await manager.send("message", {
      userId: "user_123",
      title: "Test",
      data: { from: "john", preview: "Hey!" },
    });

    expectTypeOf(messageResult.data).toMatchTypeOf<{
      from: string;
      preview: string;
    }>();

    // When sending "alert", data should have severity
    const alertResult = await manager.send("alert", {
      userId: "user_123",
      title: "Test",
      data: { severity: "warning" },
    });

    expectTypeOf(alertResult.data).toMatchTypeOf<{
      severity: "info" | "warning" | "error";
    }>();
  });

  it("should expose types object", () => {
    const messageSchema = z.object({ from: z.string() });
    const alertSchema = z.object({ severity: z.string() });

    const manager = createNotificationManager({
      types: {
        message: messageSchema,
        alert: alertSchema,
      },
      adapter: createMemoryAdapter(),
    });

    // Types should be accessible
    expectTypeOf(manager.types).toBeObject();
  });
});

describe("InferNotificationTypes utility", () => {
  it("should infer types from StandardSchemaV1", () => {
    type Schema = {
      message: StandardSchemaV1<{ from: string }>;
      alert: StandardSchemaV1<{ severity: string }>;
    };

    type Inferred = InferNotificationTypes<Schema>;

    expectTypeOf<Inferred["message"]>().toEqualTypeOf<{ from: string }>();
    expectTypeOf<Inferred["alert"]>().toEqualTypeOf<{ severity: string }>();
  });

  it("should pass through plain object types", () => {
    type Schema = {
      message: { from: string };
      alert: { severity: string };
    };

    type Inferred = InferNotificationTypes<Schema>;

    expectTypeOf<Inferred["message"]>().toEqualTypeOf<{ from: string }>();
    expectTypeOf<Inferred["alert"]>().toEqualTypeOf<{ severity: string }>();
  });
});

describe("NotificationFilter type", () => {
  it("should constrain type field to defined types", () => {
    type Types = {
      message: { from: string };
      alert: { severity: string };
    };

    type Filter = NotificationFilter<Types>;

    expectTypeOf<Filter["type"]>().toEqualTypeOf<
      "message" | "alert" | undefined
    >();
  });

  it("should default to string when no types provided", () => {
    type Filter = NotificationFilter;

    expectTypeOf<Filter["type"]>().toEqualTypeOf<string | undefined>();
  });
});

describe("plain types (no schema)", () => {
  it("should work with plain object types", async () => {
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

    expectTypeOf(notification.data).toMatchTypeOf<MessageData>();
  });
});
