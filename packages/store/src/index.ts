import {
  type StoreApi,
  createStore as zustandCreateStore,
  useStore as zustandUseStore,
} from "zustand";
import type { StorePlugin } from "./plugins";

export type SetState<TState> = (
  updater:
    | TState
    | Partial<TState>
    | ((state: TState) => TState | Partial<TState> | void),
  replace?: boolean,
) => void;
export type GetState<TState> = StoreApi<TState>["getState"];

interface StoreConfig<TState extends object, TActions extends object> {
  state: TState;
  actions?: (set: SetState<TState>, get: GetState<TState>) => TActions;
}

interface StoreOptions {
  plugins?: StorePlugin[];
}

export function createStore<
  TState extends object,
  TActions extends object = Record<string, never>,
>(config: StoreConfig<TState, TActions>, options?: StoreOptions) {
  const creator = () => config.state;
  const wrappedCreator =
    options?.plugins?.reduce(
      (acc, plugin) => (plugin.middleware?.(acc) ?? acc) as () => TState,
      creator,
    ) ?? creator;

  const store = zustandCreateStore<TState>(wrappedCreator);

  options?.plugins?.forEach((plugin) => {
    plugin.onStoreCreated?.(store as StoreApi<unknown>);
  });

  let actions =
    config.actions?.(store.setState as SetState<TState>, store.getState) ??
    ({} as TActions);

  options?.plugins?.forEach((plugin) => {
    if (plugin.onActionsCreated) {
      actions = plugin.onActionsCreated(actions);
    }
  });

  return {
    store,
    actions,
    getState: store.getState,
    setState: store.setState,
    subscribe: store.subscribe,
    useStore: <TSelected>(selector: (state: TState) => TSelected) =>
      zustandUseStore(store, selector),
  };
}
