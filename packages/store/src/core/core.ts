import { createStore as zustandCreateStore } from "zustand/vanilla";
import type { ExtractExtensions, PluginResult } from "./plugins/plugin";
import type { SetState, Store, StoreApi } from "./types";

export type StoreOptions<TState, TActions, TResults extends PluginResult[]> = {
  state: TState;
  actions: (store: StoreApi<TState>) => TActions;
  plugins?: { [K in keyof TResults]: (store: StoreApi<TState>) => TResults[K] };
};

export function createStore<TState, TActions, TResults extends PluginResult[]>(
  options: StoreOptions<TState, TActions, TResults>,
): Store<TState, TActions, TResults> {
  const zustandStore = zustandCreateStore<TState>(() => options.state);
  let pluginResults: TResults;
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

  pluginResults = (options.plugins?.map((factory) => factory(store)) ??
    []) as TResults;

  const middlewares = pluginResults
    .map((p) => p.middleware)
    .filter((m): m is NonNullable<typeof m> => m != null);

  currentSetState = middlewares.reduce<SetState<TState>>(
    (setState, middleware) => middleware(setState, store.getState),
    baseSetState,
  );

  const extension = {} as ExtractExtensions<TResults>;
  for (const plugin of pluginResults) {
    if ("extend" in plugin && plugin.extend) {
      (extension as Record<string, unknown>)[plugin.id] = plugin.extend;
    }
  }

  const actions = options.actions(store);

  return {
    state: options.state,
    actions,
    store,
    extension,
  };
}
