import {
  type StoreApi,
  createStore as zustandCreateStore,
  useStore as zustandUseStore,
} from "zustand";

export type SetState<TState> = StoreApi<TState>["setState"];
export type GetState<TState> = StoreApi<TState>["getState"];

interface StoreConfig<TState extends object, TActions extends object> {
  state: TState;
  actions: (set: SetState<TState>, get: GetState<TState>) => TActions;
}

export function createStore<TState extends object, TActions extends object>(
  config: StoreConfig<TState, TActions>,
) {
  const store = zustandCreateStore<TState>(() => config.state);
  const actions = config.actions(store.setState, store.getState);

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
