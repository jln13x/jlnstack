/**
 * Standard Schema V1 type for schema inference.
 * Compatible with zod, valibot, arktype, and other Standard Schema libraries.
 */
type StandardSchemaV1<T = unknown> = {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: (
      value: unknown,
    ) => { value: T } | { issues: readonly unknown[] };
  };
  readonly "~output"?: T;
};

/**
 * Error thrown when notification data fails schema validation.
 */
class NotificationValidationError extends Error {
  constructor(
    public readonly type: string,
    public readonly issues: readonly unknown[],
  ) {
    const issueMessages = issues
      .map((issue) => {
        if (typeof issue === "object" && issue !== null && "message" in issue) {
          return (issue as { message: string }).message;
        }
        return String(issue);
      })
      .join(", ");
    super(`Invalid data for notification type "${type}": ${issueMessages}`);
    this.name = "NotificationValidationError";
  }
}

/**
 * Parse notification data through its schema.
 * Returns the validated data or throws NotificationValidationError.
 * Throws if the schema doesn't implement Standard Schema.
 */
function parseNotificationData<T>(
  schema: unknown,
  data: unknown,
  type: string,
): T {
  const standardSchema = schema as StandardSchemaV1 | undefined;
  const validate = standardSchema?.["~standard"]?.validate;

  if (!validate) {
    throw new Error(
      `Schema for notification type "${type}" must implement Standard Schema (e.g., Zod, Valibot, ArkType)`,
    );
  }

  const result = validate(data);

  if ("issues" in result) {
    throw new NotificationValidationError(type, result.issues);
  }

  return result.value as T;
}

/**
 * Infer the output type from a Standard Schema or plain type.
 */
type InferSchema<T> = T extends StandardSchemaV1<infer O>
  ? O
  : T extends { _output: infer O }
    ? O
    : T;

/**
 * Schema definition for notification types.
 * Each key is a notification type name, value is a Standard Schema or plain object type.
 * Uses a loose constraint to accept ZodObject, Valibot, ArkType, etc.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NotificationSchemaDefinition = Record<string, any>;

/**
 * Infer notification types from a schema definition.
 * Maps each schema to its output type.
 */
type InferNotificationTypes<T extends NotificationSchemaDefinition> = {
  [K in keyof T]: InferSchema<T[K]>;
};

/**
 * Constraint for resolved notification types (after inference).
 */
type NotificationTypesConstraint = Record<string, Record<string, unknown>>;

/**
 * Transformer for transforming data across network boundaries.
 * Use this to preserve Date objects and other non-JSON types.
 *
 * @example
 * ```ts
 * import superjson from "superjson"
 *
 * const transformer: Transformer = {
 *   serialize: (data) => superjson.serialize(data),
 *   deserialize: (data) => superjson.deserialize(data),
 * }
 * ```
 */
type Transformer = {
  serialize: (data: unknown) => unknown;
  deserialize: <T>(data: unknown) => T;
};

/**
 * Base notification fields shared across all notification types.
 */
type NotificationBase = {
  id: string;
  recipientId: string;
  title: string;
  body?: string;
  read: boolean;
  archived: boolean;
  createdAt: Date;
  readAt?: Date;
};

/**
 * A notification with a specific type and its associated data.
 * Creates a discriminated union based on the type field.
 */
type Notification<
  Types extends NotificationTypesConstraint,
  K extends keyof Types = keyof Types,
> = K extends keyof Types
  ? NotificationBase & {
      type: K;
      data: Types[K];
    }
  : never;

/**
 * Input for creating a new notification.
 * Omits system-generated fields like id, read, archived, createdAt, readAt.
 */
type NotificationInput<
  Types extends NotificationTypesConstraint,
  K extends keyof Types = keyof Types,
> = K extends keyof Types
  ? {
      type: K;
      recipientId: string;
      title: string;
      body?: string;
      data: Types[K];
    }
  : never;

/**
 * Filter options for querying notifications.
 */
type NotificationFilter<
  Types extends NotificationTypesConstraint = NotificationTypesConstraint,
> = {
  recipientId?: string;
  type?: keyof Types & string;
  read?: boolean;
  archived?: boolean;
  limit?: number;
  offset?: number;
};

/**
 * Adapter interface for notification storage backends.
 * Implementations can use in-memory, Drizzle, Prisma, etc.
 */
type NotificationAdapter<Types extends NotificationTypesConstraint> = {
  /**
   * Insert a new notification.
   */
  insert(input: NotificationInput<Types>): Promise<Notification<Types>>;

  /**
   * Find a notification by ID.
   */
  findById(id: string): Promise<Notification<Types> | null>;

  /**
   * Find multiple notifications matching the filter.
   */
  findMany(filter: NotificationFilter<Types>): Promise<Notification<Types>[]>;

  /**
   * Count notifications matching the filter.
   */
  count(filter: NotificationFilter<Types>): Promise<number>;

  /**
   * Update a notification by ID.
   */
  update(
    id: string,
    data: Partial<Pick<NotificationBase, "read" | "archived" | "readAt">>,
  ): Promise<Notification<Types> | null>;

  /**
   * Delete a notification by ID.
   */
  delete(id: string): Promise<boolean>;

  /**
   * Mark multiple notifications as read.
   */
  markAsRead(ids: string[]): Promise<void>;

  /**
   * Mark all notifications for a user as read.
   */
  markAllAsRead(recipientId: string): Promise<void>;

  /**
   * Delete multiple notifications matching the filter.
   */
  deleteMany(filter: NotificationFilter<Types>): Promise<number>;
};

/**
 * Options for creating a notification manager.
 */
type NotificationManagerOptions<TSchema extends NotificationSchemaDefinition> =
  {
    /**
     * Notification type definitions.
     * Each key is a notification type, value is a Standard Schema or plain type.
     */
    types: TSchema;

    /**
     * Storage adapter for persisting notifications.
     * Accepts any adapter - types are enforced at the manager level.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    adapter: NotificationAdapter<any>;

    /**
     * Hook called after a notification is sent.
     * Use this to trigger side effects like sending emails, push notifications, etc.
     *
     * @example
     * ```ts
     * onSend: async (notification) => {
     *   if (notification.type === "alert") {
     *     await sendEmail(notification);
     *   }
     * }
     * ```
     */
    onSend?: (
      notification: Notification<InferNotificationTypes<TSchema>>,
    ) => void | Promise<void>;
  };

/**
 * Input for sending a notification.
 * Includes type for discriminated union narrowing.
 */
type SendInput<
  Types extends NotificationTypesConstraint,
  K extends keyof Types & string = keyof Types & string,
> = {
  type: K;
  recipientId: string;
  title: string;
  body?: string;
  data: Types[K];
};

type NotificationManager<Types extends NotificationTypesConstraint> = {
  /**
   * Send a new notification.
   *
   * @example
   * ```ts
   * await manager.send({
   *   type: "message",
   *   recipientId: "user_123",
   *   title: "New message",
   *   data: { from: "john", preview: "Hey!" }
   * });
   * ```
   */
  send<K extends keyof Types & string>(
    input: SendInput<Types, K>,
  ): Promise<Notification<Types, K>>;

  /**
   * Get a notification by ID.
   */
  get(id: string): Promise<Notification<Types> | null>;

  /**
   * List notifications matching the filter.
   *
   * @example
   * ```ts
   * const unread = await manager.list({ recipientId: "user_123", read: false });
   * ```
   */
  list(filter?: NotificationFilter<Types>): Promise<Notification<Types>[]>;

  /**
   * Count notifications matching the filter.
   *
   * @example
   * ```ts
   * const unreadCount = await manager.count({ recipientId: "user_123", read: false });
   * ```
   */
  count(filter?: NotificationFilter<Types>): Promise<number>;

  /**
   * Get unread count for a user.
   * Shorthand for `count({ recipientId, read: false })`.
   */
  unreadCount(recipientId: string): Promise<number>;

  /**
   * Mark a notification as read.
   */
  markAsRead(id: string): Promise<Notification<Types> | null>;

  /**
   * Mark multiple notifications as read.
   */
  markManyAsRead(ids: string[]): Promise<void>;

  /**
   * Mark all notifications for a user as read.
   */
  markAllAsRead(recipientId: string): Promise<void>;

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
  deleteMany(filter: NotificationFilter<Types>): Promise<number>;

  /**
   * Access the underlying adapter for advanced operations.
   */
  adapter: NotificationAdapter<Types>;

  /**
   * The notification type definitions.
   */
  types: Record<keyof Types, unknown>;
};

/**
 * Creates a notification manager with type-safe notification definitions.
 *
 * @example
 * ```ts
 * import { z } from "zod";
 *
 * const manager = createNotificationManager({
 *   types: {
 *     message: z.object({ from: z.string(), preview: z.string() }),
 *     alert: z.object({ severity: z.enum(["info", "warning", "error"]) }),
 *   },
 *   adapter: createMemoryAdapter(),
 * });
 *
 * // Type-safe - data must match the schema
 * await manager.send({
 *   type: "message",
 *   recipientId: "user_123",
 *   title: "New message from John",
 *   data: { from: "john", preview: "Hey there!" }
 * });
 * ```
 */
function createNotificationManager<
  TSchema extends NotificationSchemaDefinition,
>(
  options: NotificationManagerOptions<TSchema>,
): NotificationManager<InferNotificationTypes<TSchema>> {
  type Types = InferNotificationTypes<TSchema>;

  const { types, adapter, onSend } = options;

  return {
    async send<K extends keyof Types & string>(
      input: SendInput<Types, K>,
    ): Promise<Notification<Types, K>> {
      // Validate data against the schema for this notification type
      const schema = types[input.type];
      const validatedData = parseNotificationData<Types[K]>(
        schema,
        input.data,
        input.type,
      );

      // Type assertion needed because TypeScript can't narrow the generic K
      // to the specific discriminated union member at compile time
      const notification = await adapter.insert({
        type: input.type,
        recipientId: input.recipientId,
        title: input.title,
        body: input.body,
        data: validatedData,
      } as never);

      if (onSend) {
        await onSend(notification as Notification<Types>);
      }

      return notification as Notification<Types, K>;
    },

    async get(id: string): Promise<Notification<Types> | null> {
      return adapter.findById(id) as Promise<Notification<Types> | null>;
    },

    async list(
      filter: NotificationFilter<Types> = {},
    ): Promise<Notification<Types>[]> {
      return adapter.findMany(filter) as Promise<Notification<Types>[]>;
    },

    async count(filter: NotificationFilter<Types> = {}): Promise<number> {
      return adapter.count(filter);
    },

    async unreadCount(recipientId: string): Promise<number> {
      return adapter.count({ recipientId, read: false });
    },

    async markAsRead(id: string): Promise<Notification<Types> | null> {
      return adapter.update(id, {
        read: true,
        readAt: new Date(),
      }) as Promise<Notification<Types> | null>;
    },

    async markManyAsRead(ids: string[]): Promise<void> {
      return adapter.markAsRead(ids);
    },

    async markAllAsRead(recipientId: string): Promise<void> {
      return adapter.markAllAsRead(recipientId);
    },

    async archive(id: string): Promise<Notification<Types> | null> {
      return adapter.update(id, {
        archived: true,
      }) as Promise<Notification<Types> | null>;
    },

    async unarchive(id: string): Promise<Notification<Types> | null> {
      return adapter.update(id, {
        archived: false,
      }) as Promise<Notification<Types> | null>;
    },

    async delete(id: string): Promise<boolean> {
      return adapter.delete(id);
    },

    async deleteMany(filter: NotificationFilter<Types>): Promise<number> {
      return adapter.deleteMany(filter);
    },

    adapter: adapter as NotificationAdapter<Types>,
    types: types as Record<keyof Types, unknown>,
  };
}

export {
  createNotificationManager,
  NotificationValidationError,
  parseNotificationData,
  type InferNotificationTypes,
  type InferSchema,
  type Notification,
  type NotificationAdapter,
  type NotificationBase,
  type NotificationFilter,
  type NotificationInput,
  type NotificationManager,
  type NotificationManagerOptions,
  type NotificationSchemaDefinition,
  type NotificationTypesConstraint,
  type SendInput,
  type Transformer,
  type StandardSchemaV1,
};
