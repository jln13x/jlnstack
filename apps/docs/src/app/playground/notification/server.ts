import {
  createMemoryAdapter,
  createNotificationManager,
  type Transformer,
} from "@jlnstack/notification";
import { createNotificationHandlers } from "@jlnstack/notification/server";
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

const handlers = createNotificationHandlers({
  manager: getManager(),
  transformer,
});

export { getManager, handlers, notificationTypes, transformer };
