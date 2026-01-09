import type { StoreApi } from "zustand";

export interface ReactPlugin<
  TId extends string = string,
  TExtensions = object,
  TState extends object = object,
> {
  id: TId;
  middleware?: (creator: () => unknown) => () => unknown;
  onStoreCreated?: (store: StoreApi<TState>) => void;
  onActionsCreated?: <T extends object>(actions: T) => T;
  extend?: (store: StoreApi<TState>, initialState: TState) => TExtensions;
  useHook?: (store: StoreApi<TState>) => void;
}

export type AnyReactPlugin = ReactPlugin<string, unknown, object>;
