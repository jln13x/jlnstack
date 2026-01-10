import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
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

export type ReactPluginResult = PluginResult & {
  useHook?: () => void;
};

type ReactStoreOptions<
  TInitialState,
  TState,
  TActions,
  TResults extends ReactPluginResult[],
> = {
  state: (initialState: TInitialState) => TState;
  actions: (store: StoreApi<TState>) => TActions;
  plugins?: { [K in keyof TResults]: (store: StoreApi<TState>) => TResults[K] };
};

interface ProviderProps<TInitialState> {
  initialState: TInitialState;
  children: ReactNode;
}

interface ReactStore<
  TState extends object,
  TActions extends object,
  TInitialState,
  TResults extends ReactPluginResult[],
> {
  Provider: (props: ProviderProps<TInitialState>) => ReactNode;
  useStore: <TSelected>(selector: (state: TState) => TSelected) => TSelected;
  useActions: () => TActions;
  useExtensions: () => ExtractExtensions<TResults>;
}

type ContextValue<
  TState,
  TActions,
  TResults extends ReactPluginResult[],
> = CoreStore<TState, TActions, TResults>;

export function createReactStore<
  TInitialState,
  TState extends object,
  TActions extends object,
  const TResults extends ReactPluginResult[],
>(
  config: ReactStoreOptions<TInitialState, TState, TActions, TResults>,
): ReactStore<TState, TActions, TInitialState, TResults> {
  const Context = createContext<ContextValue<
    TState,
    TActions,
    TResults
  > | null>(null);

  const Provider = ({
    initialState,
    children,
  }: ProviderProps<TInitialState>) => {
    const [value] = useState(() => {
      const store = createStore({
        state: config.state(initialState),
        actions: config.actions,
        plugins: config.plugins,
      });

      return store as ContextValue<TState, TActions, TResults>;
    });

    // biome-ignore lint/correctness/useExhaustiveDependencies: <explanation>
    const pluginResults = useMemo(
      () => config.plugins?.map((factory) => factory(value.store)) ?? [],
      [value.store],
    );

    for (const plugin of pluginResults) {
      // biome-ignore lint/correctness/useHookAtTopLevel: <explanation>
      plugin.useHook?.();
    }

    return <Context.Provider value={value}>{children}</Context.Provider>;
  };

  const useCtx = () => {
    const ctx = useContext(Context);
    if (!ctx) throw new Error(`Missing Store Provider`);
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
