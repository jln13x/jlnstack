import { type UseQueryStatesKeysMap, useQueryStates } from "nuqs";
import { useEffect, useState } from "react";
import type { StoreApi } from "zustand";
import type { StorePlugin } from "./plugins";

export interface ReactPlugin<TState extends object = object>
  extends StorePlugin {
  useHook?: (store: StoreApi<TState>) => void;
}

export function nuqs<T extends UseQueryStatesKeysMap>(parsers: T): ReactPlugin {
  const keys = Object.keys(parsers);

  return {
    useHook: (store) => {
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
