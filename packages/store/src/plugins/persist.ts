import type { StoreApi } from "zustand";
import {
  createJSONStorage,
  type PersistOptions as ZustandPersistOptions,
  persist as zustandPersist,
} from "zustand/middleware";
import { createPlugin } from "../index";

export interface PersistOptions<TState> {
  name: string;
  storage?: "localStorage" | "sessionStorage";
  partialize?: (state: TState) => Partial<TState>;
  version?: number;
  migrate?: (
    persistedState: unknown,
    version: number,
  ) => TState | Promise<TState>;
  merge?: (persistedState: unknown, currentState: TState) => TState;
  skipHydration?: boolean;
  onRehydrateStorage?: (
    state: TState,
  ) => ((state?: TState, error?: unknown) => void) | undefined;
}

export interface PersistApi<TState> {
  getOptions: () => PersistOptions<TState>;
  clearStorage: () => void;
  rehydrate: () => Promise<void> | void;
  hasHydrated: () => boolean;
  onHydrate: (fn: (state: TState) => void) => () => void;
  onFinishHydration: (fn: (state: TState) => void) => () => void;
}

export function persist<TState extends object>(
  options: PersistOptions<TState>,
) {
  const storageImpl =
    options.storage === "sessionStorage" ? sessionStorage : localStorage;

  const zustandOptions: ZustandPersistOptions<TState, Partial<TState>> = {
    name: options.name,
    storage: createJSONStorage(() => storageImpl),
    partialize: options.partialize,
    version: options.version,
    migrate: options.migrate as ZustandPersistOptions<
      TState,
      Partial<TState>
    >["migrate"],
    merge: options.merge as ZustandPersistOptions<
      TState,
      Partial<TState>
    >["merge"],
    skipHydration: options.skipHydration,
    onRehydrateStorage: options.onRehydrateStorage,
  };

  let persistApi: PersistApi<TState> | undefined;

  const plugin = createPlugin({
    id: "persist",
    middleware: (creator) => {
      const wrapped = zustandPersist(
        creator as Parameters<typeof zustandPersist>[0],
        zustandOptions as ZustandPersistOptions<unknown, Partial<TState>>,
      );
      return wrapped as () => unknown;
    },
    onStoreCreated: (store) => {
      const persistStore = store as StoreApi<TState> & {
        persist: PersistApi<TState>;
      };
      if (persistStore.persist) {
        persistApi = persistStore.persist;
      }
    },
  });

  const pluginWithApi = plugin as typeof plugin & {
    persist?: PersistApi<TState>;
  };

  Object.defineProperty(pluginWithApi, "persist", {
    get: () => persistApi,
  });

  return pluginWithApi;
}
