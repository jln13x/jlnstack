import type { StoreApi } from "zustand";
import type { PluginConfig } from "../../index";

// React plugin extends core PluginConfig with useHook
export type ReactPluginConfig<
  TId extends string = string,
  TStateConstraint extends object = object,
> = PluginConfig<TId, TStateConstraint> & {
  useHook?: <S extends TStateConstraint>(store: StoreApi<S>) => void;
};
