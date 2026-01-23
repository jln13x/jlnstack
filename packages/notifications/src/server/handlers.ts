import type {
  NotificationManager,
  NotificationTypesConstraint,
  Transformer,
} from "../manager";

type NextRequest = {
  method: string;
  url: string;
  json: () => Promise<unknown>;
};

type RouteContext = {
  params: Promise<{ path?: string[] }>;
};

type RouteHandler = (
  request: NextRequest,
  context: RouteContext,
) => Promise<Response>;

type NotificationHandlers = {
  GET: RouteHandler;
  POST: RouteHandler;
  DELETE: RouteHandler;
};

type NotificationHandlersOptions<Types extends NotificationTypesConstraint> = {
  manager: NotificationManager<Types>;
  /**
   * Get the recipient ID for this request.
   * This determines which notifications the request can access.
   *
   * The function should:
   * - Extract the authenticated user/entity from the request (e.g., via cookies, headers)
   * - Return the ID of the entity whose notifications should be accessed
   * - Throw an error if the request is not authenticated
   *
   * @example
   * ```ts
   * const handlers = createNotificationHandlers({
   *   manager,
   *   getId: async (request) => {
   *     const session = await auth.api.getSession({
   *       headers: request.headers,
   *     });
   *     if (!session?.user) {
   *       throw new Error('Unauthorized');
   *     }
   *     return session.user.id;
   *   },
   * });
   * ```
   */
  getId: (request: NextRequest) => Promise<string> | string;
  /**
   * Transformer for transforming data across network boundaries.
   * Use the same transformer on both server and client.
   *
   * @example
   * ```ts
   * import superjson from "superjson"
   * import type { Transformer } from "@jlnstack/notifications"
   *
   * const transformer: Transformer = {
   *   serialize: (data) => superjson.serialize(data),
   *   deserialize: (data) => superjson.deserialize(data),
   * }
   *
   * const handlers = createNotificationHandlers({ manager, transformer })
   * ```
   */
  transformer?: Transformer;
};

function createJsonResponse(serialize: (data: unknown) => unknown) {
  return function jsonResponse(data: unknown, status = 200): Response {
    return new Response(JSON.stringify(serialize(data)), {
      status,
      headers: { "Content-Type": "application/json" },
    });
  };
}

function errorResponse(message: string, status = 400): Response {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Creates Next.js App Router handlers for notification operations.
 *
 * All operations are automatically scoped to the authenticated recipient via the `getId` callback.
 * The recipient ID is determined server-side, so clients don't need to pass it.
 *
 * Mount this at a catch-all route like `app/api/notifications/[...path]/route.ts`:
 *
 * @example
 * ```ts
 * // lib/notifications.ts
 * import { createNotificationManager, createMemoryAdapter, type Transformer } from "@jlnstack/notifications"
 * import { createNotificationHandlers } from "@jlnstack/notifications/server"
 * import { auth } from "@/lib/auth" // your auth library
 * import superjson from "superjson"
 *
 * export const transformer: Transformer = {
 *   serialize: (data) => superjson.serialize(data),
 *   deserialize: (data) => superjson.deserialize(data),
 * }
 *
 * export const manager = createNotificationManager({
 *   types: { message: z.object({ from: z.string() }) },
 *   adapter: createMemoryAdapter(),
 * })
 *
 * export const handlers = createNotificationHandlers({
 *   manager,
 *   transformer,
 *   getId: async (request) => {
 *     const session = await auth.api.getSession({ headers: request.headers });
 *     if (!session?.user) throw new Error("Unauthorized");
 *     return session.user.id;
 *   },
 * })
 * ```
 *
 * ```ts
 * // app/api/notifications/[...path]/route.ts
 * import { handlers } from "@/lib/notifications"
 * export const { GET, POST, DELETE } = handlers
 * ```
 *
 * API Routes (all scoped to authenticated recipient):
 * - `GET /api/notifications` - List notifications (query: type, read, archived, limit, offset)
 * - `GET /api/notifications/count` - Count notifications (same query params)
 * - `GET /api/notifications/unread-count` - Get unread count
 * - `GET /api/notifications/:id` - Get a single notification
 * - `POST /api/notifications/send` - Send notification to self (body: { type, title, body?, data })
 * - `POST /api/notifications/:id/read` - Mark as read
 * - `POST /api/notifications/read-all` - Mark all as read
 * - `POST /api/notifications/:id/archive` - Archive
 * - `POST /api/notifications/:id/unarchive` - Unarchive
 * - `DELETE /api/notifications/:id` - Delete notification
 */
function createNotificationHandlers<Types extends NotificationTypesConstraint>(
  options: NotificationHandlersOptions<Types>,
): NotificationHandlers {
  const { manager, transformer, getId } = options;
  const serialize = transformer?.serialize ?? ((data) => data);
  const jsonResponse = createJsonResponse(serialize);

  const GET: RouteHandler = async (request, context) => {
    // Authenticate and get the recipient ID
    let recipientId: string;
    try {
      recipientId = await getId(request);
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : "Unauthorized",
        401,
      );
    }

    const { path = [] } = await context.params;
    const url = new URL(request.url);
    const searchParams = url.searchParams;

    // Parse common filter params, always scoped to the authenticated recipient
    const filter = {
      recipientId: recipientId,
      type: searchParams.get("type") ?? undefined,
      read: searchParams.has("read")
        ? searchParams.get("read") === "true"
        : undefined,
      archived: searchParams.has("archived")
        ? searchParams.get("archived") === "true"
        : undefined,
      limit: searchParams.has("limit")
        ? parseInt(searchParams.get("limit") ?? "", 10)
        : undefined,
      offset: searchParams.has("offset")
        ? parseInt(searchParams.get("offset") ?? "", 10)
        : undefined,
    };

    try {
      // GET /count
      if (path[0] === "count") {
        const count = await manager.count(filter);
        return jsonResponse({ count });
      }

      // GET /unread-count
      if (path[0] === "unread-count") {
        const count = await manager.unreadCount(recipientId);
        return jsonResponse({ count });
      }

      // GET /:id
      const pathId = path[0];
      if (
        path.length === 1 &&
        pathId &&
        pathId !== "count" &&
        pathId !== "unread-count"
      ) {
        const notification = await manager.get(pathId);
        if (!notification) {
          return errorResponse("Notification not found", 404);
        }
        // Verify the notification belongs to the authenticated recipient
        if (notification.recipientId !== recipientId) {
          return errorResponse("Forbidden", 403);
        }
        return jsonResponse({ data: notification });
      }

      // GET / - List notifications
      const notifications = await manager.list(filter);
      return jsonResponse({ data: notifications });
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : "Unknown error",
        500,
      );
    }
  };

  const POST: RouteHandler = async (request, context) => {
    // Authenticate and get the recipient ID
    let recipientId: string;
    try {
      recipientId = await getId(request);
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : "Unauthorized",
        401,
      );
    }

    const { path = [] } = await context.params;

    try {
      let body: Record<string, unknown> = {};
      try {
        body = (await request.json()) as Record<string, unknown>;
      } catch {
        // Empty body is fine for some endpoints
      }

      // POST /send - Note: sends notification TO the authenticated recipient
      // For sending to other recipients, use the manager directly on the server
      if (path[0] === "send") {
        const {
          type,
          title,
          data,
          body: notificationBody,
        } = body as {
          type: string;
          title: string;
          body?: string;
          data: unknown;
        };

        if (!type || !title) {
          return errorResponse("type and title are required");
        }

        const notification = await manager.send({
          type: type as keyof Types & string,
          recipientId: recipientId,
          title,
          body: notificationBody,
          data: data as Types[keyof Types & string],
        });
        return jsonResponse({ data: notification }, 201);
      }

      // POST /read-all - Mark all as read for the authenticated recipient
      if (path[0] === "read-all") {
        await manager.markAllAsRead(recipientId);
        return jsonResponse({ success: true });
      }

      // POST /:id/read
      const postId = path[0];
      if (path.length === 2 && postId && path[1] === "read") {
        // Verify ownership before marking as read
        const existing = await manager.get(postId);
        if (!existing) {
          return errorResponse("Notification not found", 404);
        }
        if (existing.recipientId !== recipientId) {
          return errorResponse("Forbidden", 403);
        }
        const notification = await manager.markAsRead(postId);
        return jsonResponse({ data: notification });
      }

      // POST /:id/archive
      if (path.length === 2 && postId && path[1] === "archive") {
        // Verify ownership before archiving
        const existing = await manager.get(postId);
        if (!existing) {
          return errorResponse("Notification not found", 404);
        }
        if (existing.recipientId !== recipientId) {
          return errorResponse("Forbidden", 403);
        }
        const notification = await manager.archive(postId);
        return jsonResponse({ data: notification });
      }

      // POST /:id/unarchive
      if (path.length === 2 && postId && path[1] === "unarchive") {
        // Verify ownership before unarchiving
        const existing = await manager.get(postId);
        if (!existing) {
          return errorResponse("Notification not found", 404);
        }
        if (existing.recipientId !== recipientId) {
          return errorResponse("Forbidden", 403);
        }
        const notification = await manager.unarchive(postId);
        return jsonResponse({ data: notification });
      }

      return errorResponse("Unknown action", 404);
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : "Unknown error",
        500,
      );
    }
  };

  const DELETE: RouteHandler = async (request, context) => {
    // Authenticate and get the recipient ID
    let recipientId: string;
    try {
      recipientId = await getId(request);
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : "Unauthorized",
        401,
      );
    }

    const { path = [] } = await context.params;

    try {
      // DELETE /:id
      const deleteId = path[0];
      if (path.length === 1 && deleteId) {
        // Verify ownership before deleting
        const existing = await manager.get(deleteId);
        if (!existing) {
          return errorResponse("Notification not found", 404);
        }
        if (existing.recipientId !== recipientId) {
          return errorResponse("Forbidden", 403);
        }
        await manager.delete(deleteId);
        return jsonResponse({ success: true });
      }

      return errorResponse("Unknown action", 404);
    } catch (err) {
      return errorResponse(
        err instanceof Error ? err.message : "Unknown error",
        500,
      );
    }
  };

  return { GET, POST, DELETE };
}

export {
  createNotificationHandlers,
  type NotificationHandlers,
  type NotificationHandlersOptions,
};
