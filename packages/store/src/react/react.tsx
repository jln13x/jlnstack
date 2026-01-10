import {
  createContext,
  type ReactNode,
  useContext,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createStore, type StoreOptions } from "../core/core";
import type {
  Store as CoreStore,
  ExtractExtensions,
  PluginResult,
} from "../core/types";

type ReactStoreOptions<
  TInitialState,
  TState,
  TActions,
  TPlugins extends PluginResult[],
> = Omit<StoreOptions<TState, TActions, TPlugins>, "state"> & {
  name: string;
  state: (initialState: TInitialState) => TState;
};

interface ProviderProps<TInitialState> {
  initialState: TInitialState;
  children: ReactNode;
}

interface ReactStore<
  TState extends object,
  TActions extends object,
  TInitialState,
  TPlugins extends PluginResult[],
> {
  Provider: (props: ProviderProps<TInitialState>) => ReactNode;
  useStore: <TSelected>(selector: (state: TState) => TSelected) => TSelected;
  useActions: () => TActions;
  useExtensions: () => ExtractExtensions<TPlugins>;
}

export function createReactStore<
  TInitialState,
  TState extends object,
  TActions extends object,
  const TPlugins extends PluginResult[] = [],
>(
  config: ReactStoreOptions<TInitialState, TState, TActions, TPlugins>,
): ReactStore<TState, TActions, TInitialState, TPlugins> {
  type StoreInstance = CoreStore<TState, TActions, TPlugins>;

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

    return <Context.Provider value={store}>{children}</Context.Provider>;
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
