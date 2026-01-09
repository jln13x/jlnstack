import type { StoreApi } from "zustand";
import type { StorePlugin } from "../types";

export interface ReactPlugin<
  TId extends string = string,
  TExtensions = object,
  TState extends object = object,
> extends StorePlugin<TId, TExtensions> {
  useHook?: (store: StoreApi<TState>) => void;
}

export type AnyReactPlugin = ReactPlugin<string, unknown, object>;
