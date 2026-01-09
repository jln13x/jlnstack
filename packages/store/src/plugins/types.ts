import type { StoreApi } from "zustand";

export type StorePlugin<TId extends string = string, TExtensions = object> = {
  id: TId;
  middleware?: (creator: () => unknown) => () => unknown;
  onStateChange?: (state: unknown, prevState: unknown) => void;
  onActionsCreated?: <T extends object>(actions: T) => T;
  extend?: (store: StoreApi<unknown>, initialState: unknown) => TExtensions;
};

export type InferPluginId<P> = P extends { id: infer Id } ? Id : never;

export type InferPluginExtension<P> = P extends {
  extend: (store: StoreApi<unknown>, initialState: unknown) => infer E;
}
  ? E
  : never;
