import { createStore as zustandCreateStore } from "zustand/vanilla";
import type { PluginResult, SetState, Store, StoreApi } from "./types";

export type StoreOptions<TState, TActions, TPlugins extends PluginResult[]> = {
  state: TState;
  actions: (set: SetState<TState>, get: () => TState) => TActions;
  plugins?: (store: StoreApi<TState>) => TPlugins;
};

export function createStore<TState, TActions, TPlugins extends PluginResult[]>(
  options: StoreOptions<TState, TActions, TPlugins>,
): Store<TState, TActions, TPlugins> {
  const zustandStore = zustandCreateStore<TState>(() => options.state);
  let pluginResults: TPlugins;
  let silent = false;

  const baseSetState: SetState<TState> = (updater) => {
    const prevState = zustandStore.getState();
    const nextState =
      typeof updater === "function"
        ? (updater as (s: TState) => TState)(prevState)
        : updater;

    zustandStore.setState(nextState, true);

    for (const plugin of pluginResults) {
      plugin.onStateChange?.(nextState, prevState);
    }
  };

  let currentSetState = baseSetState;

  const store: StoreApi<TState> = {
    getState: zustandStore.getState,
    setStateSilent: (newState) => {
      silent = true;
      zustandStore.setState(newState, true);
      silent = false;
    },
    setState: (updater) => currentSetState(updater),
    subscribe: (listener) =>
      zustandStore.subscribe(() => {
        if (!silent) listener();
      }),
  };

  pluginResults = (options.plugins?.(store) ?? []) as TPlugins;

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

  const actions = options.actions(store.setState, store.getState);

  return {
    state: options.state,
    actions,
    store,
    extension,
  };
}
