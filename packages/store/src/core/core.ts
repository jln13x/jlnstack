import type { PluginResult, SetState, Store, StoreApi } from "./types";

export type StoreOptions<TState, TActions, TPlugins extends PluginResult[]> = {
  state: TState;
  actions: TActions;
  plugins: (store: StoreApi<TState>) => TPlugins;
};

export function createStore<TState, TActions, TPlugins extends PluginResult[]>(
  options: StoreOptions<TState, TActions, TPlugins>,
): Store<TState, TActions, TPlugins> {
  let state = options.state;
  let pluginResults: TPlugins;

  const baseSetState: SetState<TState> = (updater) => {
    const prevState = state;
    state =
      typeof updater === "function"
        ? (updater as (s: TState) => TState)(state)
        : updater;
    for (const plugin of pluginResults) {
      plugin.onStateChange?.(state, prevState);
    }
  };

  let currentSetState = baseSetState;

  const store: StoreApi<TState> = {
    getState: () => state,
    setStateSilent: (newState) => {
      state = newState;
    },
    setState: (updater) => currentSetState(updater),
  };

  pluginResults = options.plugins(store);

  const middlewares = pluginResults
    .map((p) => p.middleware)
    .filter((m): m is NonNullable<typeof m> => m != null);

  currentSetState = middlewares.reduce<SetState<TState>>(
    (setState, middleware) => middleware(setState, store.getState),
    baseSetState,
  );

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
