import type { PluginResult, Store, StoreApi } from "./types";

export type StoreOptions<TState, TActions, TPlugins extends PluginResult[]> = {
  state: TState;
  actions: TActions;
  plugins: (store: StoreApi<TState>) => TPlugins;
};

export function createStore<TState, TActions, TPlugins extends PluginResult[]>(
  options: StoreOptions<TState, TActions, TPlugins>,
): Store<TState, TActions, TPlugins> {
  let state = options.state;

  const store: StoreApi<TState> = {
    getState: () => state,
    setStateSilent: (newState) => {
      state = newState;
    },
    setState: (newState) => {
      const prevState = state;
      state = newState;
      for (const plugin of pluginResults) {
        plugin.onStateChange?.(state, prevState);
      }
    },
  };

  const pluginResults = options.plugins(store);

  const extension = {} as Store<TState, TActions, TPlugins>["extension"];
  for (const plugin of pluginResults) {
    if ("extend" in plugin && plugin.extend) {
      (extension as Record<string, unknown>)[plugin.id] = plugin.extend;
    }
  }

  return {
    state,
    actions: options.actions,
    store,
    extension,
  };
}
