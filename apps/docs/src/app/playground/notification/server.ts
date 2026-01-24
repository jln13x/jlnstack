import {
  createMemoryAdapter,
  createNotificationManager,
  type Transformer,
} from "@jlnstack/notifications";
import { createNotificationHandlers } from "@jlnstack/notifications/server";
import superjson from "superjson";
import { z } from "zod";

const notificationTypes = {
  message: z.object({
    from: z.string(),
    preview: z.string(),
  }),
  alert: z.object({
    severity: z.enum(["info", "warning", "error"]),
  }),
  system: z.object({
    action: z.string().optional(),
  }),
};

const transformer: Transformer = {
  serialize: (data) => superjson.serialize(data),
  deserialize: (data) =>
    superjson.deserialize(data as Parameters<typeof superjson.deserialize>[0]),
};

// Singleton manager that persists across requests in the dev server
const globalKey = Symbol.for("@playground/notification-manager");

type ManagerType = ReturnType<
  typeof createNotificationManager<typeof notificationTypes>
>;

function getManager(): ManagerType {
  const g = globalThis as typeof globalThis & {
    [globalKey]?: ManagerType;
  };
  if (!g[globalKey]) {
    g[globalKey] = createNotificationManager({
      types: notificationTypes,
      adapter: createMemoryAdapter(),
    });
  }
  return g[globalKey];
}

// Demo recipient ID for the playground
const DEMO_RECIPIENT_ID = "recipient_demo";

const handlers = createNotificationHandlers({
  manager: getManager(),
  getId: () => DEMO_RECIPIENT_ID,
  transformer,
});

export { getManager, handlers, notificationTypes, transformer };
