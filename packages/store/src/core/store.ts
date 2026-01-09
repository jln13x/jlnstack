import type { PluginResult, Store, StoreApi } from "./types";

export type StoreOptions<TState, TActions, TPlugins extends PluginResult[]> = {
  state: TState;
  actions: TActions;
  plugins: (store: StoreApi<TState>) => TPlugins;
};

export declare function createStore<
  TState,
  TActions,
  TPlugins extends PluginResult[],
>(
  options: StoreOptions<TState, TActions, TPlugins>,
): Store<TState, TActions, TPlugins>;
