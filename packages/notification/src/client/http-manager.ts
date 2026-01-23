import type {
  Notification,
  NotificationFilter,
  NotificationTypesConstraint,
  SendOptions,
  Transformer,
} from "../manager";

/**
 * HTTP-based notification manager for client-side use.
 * Similar to NotificationManager but with auth-aware methods that don't require userId.
 */
type HttpNotificationManager<Types extends NotificationTypesConstraint> = {
  /**
   * Send a notification to the authenticated user.
   * The userId is automatically set from the server-side auth context.
   */
  send<K extends keyof Types & string>(
    type: K,
    options: Omit<SendOptions<Types, K>, "userId">,
  ): Promise<Notification<Types, K>>;

  /**
   * Get a notification by ID.
   * Only returns notifications belonging to the authenticated user.
   */
  get(id: string): Promise<Notification<Types> | null>;

  /**
   * List notifications for the authenticated user.
   * The userId filter is automatically applied server-side.
   */
  list(
    filter?: Omit<NotificationFilter<Types>, "userId">,
  ): Promise<Notification<Types>[]>;

  /**
   * Count notifications for the authenticated user.
   */
  count(filter?: Omit<NotificationFilter<Types>, "userId">): Promise<number>;

  /**
   * Get unread count for the authenticated user.
   */
  unreadCount(): Promise<number>;

  /**
   * Mark a notification as read.
   */
  markAsRead(id: string): Promise<Notification<Types> | null>;

  /**
   * Mark multiple notifications as read.
   */
  markManyAsRead(ids: string[]): Promise<void>;

  /**
   * Mark all notifications as read for the authenticated user.
   */
  markAllAsRead(): Promise<void>;

  /**
   * Archive a notification.
   */
  archive(id: string): Promise<Notification<Types> | null>;

  /**
   * Unarchive a notification.
   */
  unarchive(id: string): Promise<Notification<Types> | null>;

  /**
   * Delete a notification.
   */
  delete(id: string): Promise<boolean>;

  /**
   * Delete multiple notifications matching the filter.
   */
  deleteMany(
    filter: Omit<NotificationFilter<Types>, "userId">,
  ): Promise<number>;
};

type HttpNotificationManagerOptions = {
  /**
   * Base URL for the notification API.
   * @default "/api/notifications"
   */
  baseUrl?: string;
  /**
   * Custom fetch function. Defaults to global fetch.
   */
  fetch?: typeof fetch;
  /**
   * Transformer for transforming data across network boundaries.
   * Use the same transformer on both server and client.
   *
   * @example
   * ```ts
   * import superjson from "superjson"
   * import type { Transformer } from "@jlnstack/notification"
   *
   * const transformer: Transformer = {
   *   serialize: (data) => superjson.serialize(data),
   *   deserialize: (data) => superjson.deserialize(data),
   * }
   *
   * const manager = createHttpNotificationManager({
   *   baseUrl: "/api/notifications",
   *   transformer,
   * })
   * ```
   */
  transformer?: Transformer;
};

async function request<T>(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
  fetchFn: typeof fetch = fetch,
  deserialize: <U>(data: unknown) => U = (data) => data as never,
): Promise<T> {
  const url = path.startsWith("http") ? path : `${baseUrl}${path}`;
  const res = await fetchFn(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    if (!res.ok) {
      throw new Error(text || `HTTP ${res.status}`);
    }
    throw new Error(`Invalid JSON response: ${text.slice(0, 100)}`);
  }

  if (!res.ok) {
    const error = json as { error?: string };
    throw new Error(error.error || `HTTP ${res.status}`);
  }

  const deserialized = deserialize<{ data?: T }>(json);
  return deserialized.data ?? (deserialized as T);
}

function buildQueryString(
  filter: Omit<NotificationFilter<NotificationTypesConstraint>, "userId">,
): string {
  const params = new URLSearchParams();
  if (filter.type !== undefined) params.set("type", String(filter.type));
  if (filter.read !== undefined) params.set("read", String(filter.read));
  if (filter.archived !== undefined)
    params.set("archived", String(filter.archived));
  if (filter.limit !== undefined) params.set("limit", String(filter.limit));
  if (filter.offset !== undefined) params.set("offset", String(filter.offset));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Creates a notification manager that communicates with the server API via HTTP.
 *
 * Use this on the client-side to interact with your notification API endpoints.
 *
 * @example
 * ```ts
 * import { createHttpNotificationManager } from "@jlnstack/notification/client"
 * import { createNotificationClient, NotificationClientProvider } from "@jlnstack/notification/react"
 * import { transformer } from "@/lib/notifications" // shared transformer
 *
 * const manager = createHttpNotificationManager({
 *   baseUrl: "/api/notifications",
 *   transformer,
 * })
 *
 * const client = createNotificationClient(manager)
 *
 * // In your app:
 * <NotificationClientProvider client={client}>
 *   <App />
 * </NotificationClientProvider>
 * ```
 */
function createHttpNotificationManager<
  Types extends NotificationTypesConstraint = NotificationTypesConstraint,
>(
  options: HttpNotificationManagerOptions = {},
): HttpNotificationManager<Types> {
  const baseUrl = options.baseUrl ?? "/api/notifications";
  const fetchFn = options.fetch ?? fetch;
  const deserializeFn =
    options.transformer?.deserialize ?? ((data) => data as never);

  const manager: HttpNotificationManager<Types> = {
    async send<K extends keyof Types & string>(
      type: K,
      opts: Omit<SendOptions<Types, K>, "userId">,
    ): Promise<Notification<Types, K>> {
      return request<Notification<Types, K>>(
        baseUrl,
        "/send",
        {
          method: "POST",
          body: JSON.stringify({ type, ...opts }),
        },
        fetchFn,
        deserializeFn,
      );
    },

    async get(id: string): Promise<Notification<Types> | null> {
      try {
        return await request<Notification<Types>>(
          baseUrl,
          `/${id}`,
          {},
          fetchFn,
          deserializeFn,
        );
      } catch {
        return null;
      }
    },

    async list(
      filter: Omit<NotificationFilter<Types>, "userId"> = {},
    ): Promise<Notification<Types>[]> {
      return request<Notification<Types>[]>(
        baseUrl,
        buildQueryString(filter),
        {},
        fetchFn,
        deserializeFn,
      );
    },

    async count(
      filter: Omit<NotificationFilter<Types>, "userId"> = {},
    ): Promise<number> {
      const result = await request<{ count: number }>(
        baseUrl,
        `/count${buildQueryString(filter)}`,
        {},
        fetchFn,
        deserializeFn,
      );
      return result.count;
    },

    async unreadCount(): Promise<number> {
      const result = await request<{ count: number }>(
        baseUrl,
        `/unread-count`,
        {},
        fetchFn,
        deserializeFn,
      );
      return result.count;
    },

    async markAsRead(id: string): Promise<Notification<Types> | null> {
      return request<Notification<Types>>(
        baseUrl,
        `/${id}/read`,
        { method: "POST" },
        fetchFn,
        deserializeFn,
      );
    },

    async markManyAsRead(ids: string[]): Promise<void> {
      await Promise.all(ids.map((id) => manager.markAsRead(id)));
    },

    async markAllAsRead(): Promise<void> {
      await request(
        baseUrl,
        "/read-all",
        {
          method: "POST",
        },
        fetchFn,
        deserializeFn,
      );
    },

    async archive(id: string): Promise<Notification<Types> | null> {
      return request<Notification<Types>>(
        baseUrl,
        `/${id}/archive`,
        { method: "POST" },
        fetchFn,
        deserializeFn,
      );
    },

    async unarchive(id: string): Promise<Notification<Types> | null> {
      return request<Notification<Types>>(
        baseUrl,
        `/${id}/unarchive`,
        { method: "POST" },
        fetchFn,
        deserializeFn,
      );
    },

    async delete(id: string): Promise<boolean> {
      try {
        await request(
          baseUrl,
          `/${id}`,
          { method: "DELETE" },
          fetchFn,
          deserializeFn,
        );
        return true;
      } catch {
        return false;
      }
    },

    async deleteMany(
      filter: Omit<NotificationFilter<Types>, "userId">,
    ): Promise<number> {
      // List matching notifications and delete each
      const notifications = await manager.list(filter);
      await Promise.all(notifications.map((n) => manager.delete(n.id)));
      return notifications.length;
    },
  };

  return manager;
}

export {
  createHttpNotificationManager,
  type HttpNotificationManager,
  type HttpNotificationManagerOptions,
};
