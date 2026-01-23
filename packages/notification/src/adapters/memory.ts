import type {
  Notification,
  NotificationAdapter,
  NotificationBase,
  NotificationFilter,
  NotificationInput,
  NotificationTypesConstraint,
} from "../manager";

type MemoryAdapterOptions = {
  /**
   * Optional ID generator. Defaults to crypto.randomUUID().
   */
  generateId?: () => string;
};

const globalKey = Symbol.for("@jlnstack/notification/memory");

type NotificationStore = Map<string, NotificationBase & { type: string; data: unknown }>;

function getGlobalStore(): NotificationStore {
  const g = globalThis as typeof globalThis & {
    [globalKey]?: NotificationStore;
  };
  if (!g[globalKey]) {
    g[globalKey] = new Map();
  }
  return g[globalKey];
}

/**
 * Creates an in-memory adapter for notification storage.
 * Useful for development, testing, and simple use cases.
 *
 * Data persists across hot reloads in development but is lost when the process restarts.
 */
function createMemoryAdapter<Types extends NotificationTypesConstraint>(
  options: MemoryAdapterOptions = {},
): NotificationAdapter<Types> {
  const store = getGlobalStore() as Map<string, Notification<Types>>;
  const generateId = options.generateId ?? (() => crypto.randomUUID());

  function matchesFilter(
    notification: Notification<Types>,
    filter: NotificationFilter<Types>,
  ): boolean {
    if (filter.userId !== undefined && notification.userId !== filter.userId) {
      return false;
    }
    if (filter.type !== undefined && notification.type !== filter.type) {
      return false;
    }
    if (filter.read !== undefined && notification.read !== filter.read) {
      return false;
    }
    if (
      filter.archived !== undefined &&
      notification.archived !== filter.archived
    ) {
      return false;
    }
    return true;
  }

  return {
    async insert(
      input: NotificationInput<Types>,
    ): Promise<Notification<Types>> {
      const notification: Notification<Types> = {
        id: generateId(),
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        data: input.data,
        read: false,
        archived: false,
        createdAt: new Date(),
        readAt: undefined,
      } as Notification<Types>;

      store.set(notification.id, notification);
      return notification;
    },

    async findById(id: string): Promise<Notification<Types> | null> {
      return store.get(id) ?? null;
    },

    async findMany(
      filter: NotificationFilter<Types>,
    ): Promise<Notification<Types>[]> {
      const results: Notification<Types>[] = [];

      for (const notification of store.values()) {
        if (matchesFilter(notification, filter)) {
          results.push(notification);
        }
      }

      // Sort by createdAt descending (newest first)
      results.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

      // Apply offset and limit
      const offset = filter.offset ?? 0;
      const limit = filter.limit ?? results.length;

      return results.slice(offset, offset + limit);
    },

    async count(filter: NotificationFilter<Types>): Promise<number> {
      let count = 0;
      for (const notification of store.values()) {
        if (matchesFilter(notification, filter)) {
          count++;
        }
      }
      return count;
    },

    async update(
      id: string,
      data: Partial<Pick<Notification<Types>, "read" | "archived" | "readAt">>,
    ): Promise<Notification<Types> | null> {
      const existing = store.get(id);
      if (!existing) return null;

      const updated: Notification<Types> = {
        ...existing,
        ...data,
      };

      store.set(id, updated);
      return updated;
    },

    async delete(id: string): Promise<boolean> {
      return store.delete(id);
    },

    async markAsRead(ids: string[]): Promise<void> {
      const now = new Date();
      for (const id of ids) {
        const notification = store.get(id);
        if (notification && !notification.read) {
          store.set(id, {
            ...notification,
            read: true,
            readAt: now,
          });
        }
      }
    },

    async markAllAsRead(userId: string): Promise<void> {
      const now = new Date();
      for (const [id, notification] of store.entries()) {
        if (notification.userId === userId && !notification.read) {
          store.set(id, {
            ...notification,
            read: true,
            readAt: now,
          });
        }
      }
    },

    async deleteMany(filter: NotificationFilter<Types>): Promise<number> {
      let count = 0;
      for (const [id, notification] of store.entries()) {
        if (matchesFilter(notification, filter)) {
          store.delete(id);
          count++;
        }
      }
      return count;
    },
  };
}

/**
 * Clears all notifications from the global store.
 */
function clearMemoryStore(): void {
  getGlobalStore().clear();
}

export { clearMemoryStore, createMemoryAdapter, type MemoryAdapterOptions };
