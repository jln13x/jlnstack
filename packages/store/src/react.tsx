import { createContext, type ReactNode, useContext, useState } from "react";
import { type StoreApi, useStore } from "zustand";
import {
  createStore as createCoreStore,
  type GetState,
  type SetState,
} from "./index";

interface StoreConfig<
  TInitialState,
  TState extends object,
  TActions extends object,
> {
  name: string;
  state: (initialState: TInitialState) => TState;
  actions: (set: SetState<TState>, get: GetState<TState>) => TActions;
}

interface ProviderProps<TInitialState> {
  initialState: TInitialState;
  children: ReactNode;
}

interface Store<TState extends object, TActions extends object, TInitialState> {
  Provider: (props: ProviderProps<TInitialState>) => ReactNode;
  useStore: <TSelected>(selector: (state: TState) => TSelected) => TSelected;
  useActions: () => TActions;
}

export function createStore<
  TInitialState,
  TState extends object,
  TActions extends object,
>(
  config: StoreConfig<TInitialState, TState, TActions>,
): Store<TState, TActions, TInitialState> {
  const Context = createContext<{
    store: StoreApi<TState>;
    actions: TActions;
  } | null>(null);

  const Provider = ({
    initialState,
    children,
  }: ProviderProps<TInitialState>) => {
    const [value] = useState(() => {
      const { store, actions } = createCoreStore({
        state: config.state(initialState),
        actions: config.actions,
      });
      return { store, actions };
    });

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  const useCtx = () => {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(`Missing ${config.name} Provider`);
    return ctx;
  };

  const useStoreHook = <TSelected,>(
    selector: (state: TState) => TSelected,
  ): TSelected => useStore(useCtx().store, selector);

  const useActionsHook = (): TActions => useCtx().actions;

  return {
    Provider,
    useStore: useStoreHook,
    useActions: useActionsHook,
  };
}
