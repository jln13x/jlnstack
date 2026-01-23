"use client";

import { createContext, type ReactNode, use } from "react";
import type { HttpNotificationManager } from "../client/http-manager";
import type { NotificationTypesConstraint } from "../manager";
import type { NotificationClient } from "./client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const NotificationClientContext = createContext<NotificationClient<any> | null>(
  null,
);

type NotificationClientProviderProps<
  Types extends NotificationTypesConstraint,
> = {
  children: ReactNode;
  client: NotificationClient<Types>;
};

/**
 * Provider for the notification client.
 *
 * @example
 * ```tsx
 * const manager = createNotificationManager({ ... });
 * const client = createNotificationClient(manager);
 *
 * function App() {
 *   return (
 *     <NotificationClientProvider client={client}>
 *       <MyApp />
 *     </NotificationClientProvider>
 *   );
 * }
 * ```
 */
export function NotificationClientProvider<
  Types extends NotificationTypesConstraint,
>({ children, client }: NotificationClientProviderProps<Types>) {
  return (
    <NotificationClientContext.Provider value={client}>
      {children}
    </NotificationClientContext.Provider>
  );
}

/**
 * Hook to access the notification client.
 * Used internally by useNotifications, but can be used directly for advanced use cases.
 */
export function useNotificationClient<
  Types extends NotificationTypesConstraint = NotificationTypesConstraint,
>(): NotificationClient<Types> {
  const ctx = use(NotificationClientContext);
  if (!ctx) {
    throw new Error(
      "useNotificationClient must be used within a NotificationClientProvider",
    );
  }
  return ctx as NotificationClient<Types>;
}

/**
 * Hook to access the notification manager directly.
 * Use this when you need to perform mutations without the query state.
 *
 * @example
 * ```tsx
 * const manager = useNotificationManager();
 * await manager.send({ type: "alert", title: "Hello", data: { ... } });
 * ```
 */
export function useNotificationManager<
  Types extends NotificationTypesConstraint = NotificationTypesConstraint,
>(): HttpNotificationManager<Types> {
  const client = useNotificationClient<Types>();
  return client.getManager();
}
