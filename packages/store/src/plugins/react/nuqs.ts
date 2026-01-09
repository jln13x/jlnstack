import { type UseQueryStatesKeysMap, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import type { StoreApi } from "zustand";

export function nuqs<T extends UseQueryStatesKeysMap>(parsers: T) {
  const keys = Object.keys(parsers);

  return {
    id: "nuqs" as const,
    useHook: (store: StoreApi<object>) => {
      const [queryState, setQueryState] = useQueryStates(parsers);

      // URL → Store
      useEffect(() => {
        store.setState(queryState as Parameters<typeof store.setState>[0]);
      }, [queryState, store]);

      // Store → URL
      useState(() => {
        store.subscribe((state) => {
          const updates: Record<string, unknown> = {};
          for (const key of keys) {
            updates[key] = state[key as keyof typeof state];
          }
          setQueryState(updates as any);
        });
      });
    },
  };
}
