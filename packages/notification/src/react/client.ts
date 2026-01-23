import type {
  Notification,
  NotificationFilter,
  NotificationTypesConstraint,
} from "../manager";
import type { HttpNotificationManager } from "../client/http-manager";

/**
 * State for a notification query.
 */
export type QueryState<Types extends NotificationTypesConstraint> = {
  data: Notification<Types>[];
  error: Error | undefined;
  status: "idle" | "pending" | "success" | "error";
  dataUpdatedAt: number | undefined;
};

type HttpFilter<Types extends NotificationTypesConstraint> = Omit<NotificationFilter<Types>, "userId">;

type Query<Types extends NotificationTypesConstraint> = {
  key: string;
  filter: HttpFilter<Types>;
  state: QueryState<Types>;
  listeners: Set<() => void>;
  promise: Promise<void> | undefined;
};

/**
 * Serializes a filter object to a stable string key.
 */
function serializeFilter<Types extends NotificationTypesConstraint>(
  filter: HttpFilter<Types> | undefined,
): string {
  if (!filter) return "{}";
  // Sort keys for stable serialization
  const sorted = Object.keys(filter)
    .sort()
    .reduce(
      (acc, key) => {
        const value = filter[key as keyof typeof filter];
        if (value !== undefined) {
          acc[key] = value;
        }
        return acc;
      },
      {} as Record<string, unknown>,
    );
  return JSON.stringify(sorted);
}

/**
 * Creates a default query state.
 */
function createInitialQueryState<
  Types extends NotificationTypesConstraint,
>(): QueryState<Types> {
  return {
    data: [],
    error: undefined,
    status: "idle",
    dataUpdatedAt: undefined,
  };
}

/**
 * NotificationClient - An external store for notification queries.
 *
 * This class manages query state outside of React, enabling:
 * - Proper use of useSyncExternalStore
 * - Query deduplication (multiple components share the same query)
 * - Stale-while-revalidate pattern
 * - No state updates during render
 *
 * Similar to React Query's QueryClient architecture.
 *
 * @example
 * ```ts
 * const manager = createHttpNotificationManager({ ... });
 * const client = new NotificationClient(manager);
 *
 * // In React:
 * <NotificationClientProvider client={client}>
 *   <App />
 * </NotificationClientProvider>
 * ```
 */
export class NotificationClient<Types extends NotificationTypesConstraint> {
  private manager: HttpNotificationManager<Types>;
  private queries: Map<string, Query<Types>> = new Map();

  constructor(manager: HttpNotificationManager<Types>) {
    this.manager = manager;
  }

  /**
   * Get or create a query for the given filter.
   */
  private getOrCreateQuery(
    filter: HttpFilter<Types> | undefined,
  ): Query<Types> {
    const key = serializeFilter(filter);
    let query = this.queries.get(key);

    if (!query) {
      query = {
        key,
        filter: filter ?? {},
        state: createInitialQueryState(),
        listeners: new Set(),
        promise: undefined,
      };
      this.queries.set(key, query);
    }

    return query;
  }

  /**
   * Notify all listeners of a query that state has changed.
   */
  private notify(query: Query<Types>): void {
    query.listeners.forEach((listener) => listener());
  }

  /**
   * Subscribe to a query. Returns an unsubscribe function.
   * This is used by useSyncExternalStore.
   */
  subscribe(
    filter: HttpFilter<Types> | undefined,
    listener: () => void,
  ): () => void {
    const query = this.getOrCreateQuery(filter);
    query.listeners.add(listener);

    // Auto-fetch on first subscription if idle
    if (query.state.status === "idle" && query.listeners.size === 1) {
      this.fetch(filter);
    }

    return () => {
      query.listeners.delete(listener);
    };
  }

  /**
   * Get the current state snapshot for a query.
   * This is used by useSyncExternalStore.
   */
  getSnapshot(filter: HttpFilter<Types> | undefined): QueryState<Types> {
    const query = this.getOrCreateQuery(filter);
    return query.state;
  }

  /**
   * Fetch notifications for a filter.
   * Uses stale-while-revalidate: returns cached data immediately while fetching.
   */
  async fetch(filter?: HttpFilter<Types>): Promise<void> {
    const query = this.getOrCreateQuery(filter);

    // If already fetching, wait for existing promise
    if (query.promise) {
      return query.promise;
    }

    // Update state to pending (keep existing data for stale-while-revalidate)
    query.state = {
      ...query.state,
      status: "pending",
      error: undefined,
    };
    this.notify(query);

    const fetchPromise = (async () => {
      try {
        const data = await this.manager.list(filter);
        query.state = {
          data,
          error: undefined,
          status: "success",
          dataUpdatedAt: Date.now(),
        };
      } catch (err) {
        query.state = {
          ...query.state,
          error: err instanceof Error ? err : new Error(String(err)),
          status: "error",
        };
      } finally {
        query.promise = undefined;
        this.notify(query);
      }
    })();

    query.promise = fetchPromise;
    return fetchPromise;
  }

  /**
   * Invalidate all queries, causing them to refetch.
   * Useful after mutations to refresh data.
   */
  invalidateQueries(): void {
    this.queries.forEach((query) => {
      // Only refetch queries with active listeners
      if (query.listeners.size > 0) {
        this.fetch(query.filter);
      } else {
        // Mark as stale so next subscription triggers a fetch
        query.state = {
          ...query.state,
          status: "idle",
        };
      }
    });
  }

  /**
   * Invalidate queries matching a specific filter pattern.
   */
  invalidateQueriesMatching(
    predicate: (filter: HttpFilter<Types>) => boolean,
  ): void {
    this.queries.forEach((query) => {
      if (predicate(query.filter)) {
        if (query.listeners.size > 0) {
          this.fetch(query.filter);
        } else {
          query.state = {
            ...query.state,
            status: "idle",
          };
        }
      }
    });
  }

  /**
   * Get the underlying notification manager for mutations.
   */
  getManager(): HttpNotificationManager<Types> {
    return this.manager;
  }

  /**
   * Clear all cached queries.
   */
  clear(): void {
    this.queries.clear();
  }
}

/**
 * Create a notification client from an HTTP notification manager.
 *
 * @example
 * ```ts
 * const manager = createHttpNotificationManager({ ... });
 * const client = createNotificationClient(manager);
 * ```
 */
export function createNotificationClient<
  Types extends NotificationTypesConstraint,
>(manager: HttpNotificationManager<Types>): NotificationClient<Types> {
  return new NotificationClient(manager);
}
