import {
  createContext,
  type ReactNode,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createStore } from "../core/core";
import type {
  Store as CoreStore,
  ExtractExtensions,
  PluginResult,
  StoreApi,
} from "../core/types";

type PluginFactory<TResult extends PluginResult> = <TState>(
  store: StoreApi<TState>,
) => TResult;

type ReactStoreOptions<
  TInitialState,
  TState,
  TActions,
  TResults extends PluginResult[],
> = {
  name: string;
  state: (initialState: TInitialState) => TState;
  actions: (store: StoreApi<TState>) => TActions;
  plugins?: { [K in keyof TResults]: PluginFactory<TResults[K]> };
};

interface ProviderProps<TInitialState> {
  initialState: TInitialState;
  children: ReactNode;
}

interface ReactStore<
  TState extends object,
  TActions extends object,
  TInitialState,
  TResults extends PluginResult[],
> {
  Provider: (props: ProviderProps<TInitialState>) => ReactNode;
  useStore: <TSelected>(selector: (state: TState) => TSelected) => TSelected;
  useActions: () => TActions;
  useExtensions: () => ExtractExtensions<TResults>;
}

export function createReactStore<
  TInitialState,
  TState extends object,
  TActions extends object,
  const TResults extends PluginResult[] = [],
>(
  config: ReactStoreOptions<TInitialState, TState, TActions, TResults>,
): ReactStore<TState, TActions, TInitialState, TResults> {
  type StoreInstance = CoreStore<TState, TActions, TResults>;

  const Context = createContext<StoreInstance | null>(null);

  const Provider = ({
    initialState,
    children,
  }: ProviderProps<TInitialState>) => {
    const [store] = useState(() =>
      createStore({
        state: config.state(initialState),
        actions: config.actions,
        plugins: config.plugins,
      }),
    );

    return (
      <Context.Provider value={store as StoreInstance}>
        {children}
      </Context.Provider>
    );
  };

  const useCtx = () => {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(`Missing ${config.name} Provider`);
    return ctx;
  };

  const useStoreHook = <TSelected,>(
    selector: (state: TState) => TSelected,
  ): TSelected => {
    const { store } = useCtx();
    const selectorRef = useRef(selector);
    selectorRef.current = selector;

    return useSyncExternalStore(store.subscribe, () =>
      selectorRef.current(store.getState()),
    );
  };

  const useActionsHook = (): TActions => useCtx().actions;

  const useExtensionsHook = () => useCtx().extension;

  return {
    Provider,
    useStore: useStoreHook,
    useActions: useActionsHook,
    useExtensions: useExtensionsHook,
  };
}
