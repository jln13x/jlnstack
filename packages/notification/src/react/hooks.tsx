"use client";

import { useCallback, useMemo, useSyncExternalStore } from "react";
import type {
  Notification,
  NotificationFilter,
  NotificationTypesConstraint,
} from "../manager";
import type { HttpNotificationManager } from "../client/http-manager";
import { useNotificationClient } from "./context";
import type { QueryState } from "./client";

type HttpFilter<Types extends NotificationTypesConstraint> = Omit<NotificationFilter<Types>, "userId">;

type UseNotificationsOptions<Types extends NotificationTypesConstraint> = {
  filter?: HttpFilter<Types>;
};

type UseNotificationsReturn<Types extends NotificationTypesConstraint> = {
  /** The notification manager instance for mutations */
  manager: HttpNotificationManager<Types>;
  /** List of notifications matching the filter */
  data: Notification<Types>[];
  /** Whether a fetch is in progress */
  isPending: boolean;
  /** Whether the initial fetch is in progress (no data yet) */
  isLoading: boolean;
  /** Error if the fetch failed */
  error: Error | undefined;
  /** The query status */
  status: QueryState<Types>["status"];
  /** Refetch notifications */
  refetch: () => void;
};

/**
 * Serialize filter to a stable string for comparison.
 */
function serializeFilter<Types extends NotificationTypesConstraint>(
  filter: HttpFilter<Types> | undefined,
): string {
  if (!filter) return "{}";
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
 * Hook to manage notifications with loading states.
 * Uses useSyncExternalStore for proper React 18+ concurrent rendering support.
 *
 * The userId is automatically determined server-side from the auth context,
 * so you don't need to pass it in the filter.
 *
 * @example
 * ```tsx
 * const { manager, data, isPending, refetch } = useNotifications({
 *   filter: { read: false },
 * });
 *
 * // Query: data is the notifications list
 * {data.map(n => <div key={n.id}>{n.title}</div>)}
 *
 * // Mutations: use manager directly
 * await manager.send("message", { title: "Hello", data: { from: "john" } });
 * await manager.markAsRead(id);
 * refetch(); // Refresh the list after mutations
 * ```
 */
export function useNotifications<
  Types extends NotificationTypesConstraint = NotificationTypesConstraint,
>(options?: UseNotificationsOptions<Types>): UseNotificationsReturn<Types> {
  const client = useNotificationClient<Types>();
  const filter = options?.filter;

  // Create a stable key for the filter to detect changes
  const filterKey = useMemo(() => serializeFilter(filter), [filter]);

  // Subscribe function - recreated when filter changes to resubscribe to new query
  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      return client.subscribe(filter, onStoreChange);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [client, filterKey],
  );

  // Get snapshot function - recreated when filter changes
  const getSnapshot = useCallback(() => {
    return client.getSnapshot(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, filterKey]);

  // Use the external store
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  // Refetch function
  const refetch = useCallback(() => {
    client.fetch(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, filterKey]);

  return {
    manager: client.getManager(),
    data: state.data,
    isPending: state.status === "pending",
    isLoading: state.status === "pending" && state.data.length === 0,
    error: state.error,
    status: state.status,
    refetch,
  };
}
