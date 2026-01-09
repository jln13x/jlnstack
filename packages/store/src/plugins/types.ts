import type { StoreApi } from "zustand";

export type StorePlugin<TId extends string = string, TExtensions = object> = {
  id: TId;
  middleware?: (creator: () => unknown) => () => unknown;
  onStoreCreated?: (store: StoreApi<unknown>) => void;
  onActionsCreated?: <T extends object>(actions: T) => T;
  extend?: (store: StoreApi<unknown>, initialState: unknown) => TExtensions;
};

export type AnyStorePlugin = StorePlugin<string, unknown>;
