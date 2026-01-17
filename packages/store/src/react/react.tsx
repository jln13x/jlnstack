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
  ExtractPlugins,
  PluginResult,
  StoreApi,
} from "../core/types";

export type ReactPluginResult = PluginResult & {
  useHook?: () => void;
};

const PluginHookRunner = ({ hook }: { hook: () => void }) => {
  hook();
  return null;
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
  usePlugins: {
    (): ExtractPlugins<TResults>;
    <TSelected>(
      selector: (plugins: ExtractPlugins<TResults>) => TSelected,
    ): TSelected;
  };
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
    const { pluginResults } = value;

    return (
      <Context.Provider value={value}>
        {pluginResults.map((plugin, index) =>
          plugin.useHook ? (
            <PluginHookRunner
              key={`${plugin.id}-${index}`}
              hook={plugin.useHook}
            />
          ) : null,
        )}
        {children}
      </Context.Provider>
    );
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

  function usePluginsHook(): ExtractPlugins<TResults>;
  function usePluginsHook<TSelected>(
    selector: (plugins: ExtractPlugins<TResults>) => TSelected,
  ): TSelected;
  function usePluginsHook<TSelected>(
    selector?: (plugins: ExtractPlugins<TResults>) => TSelected,
  ): ExtractPlugins<TResults> | TSelected {
    const { store, plugins } = useCtx();
    const selectorRef = useRef(selector);
    selectorRef.current = selector;

    // Subscribe to state changes - re-render when state changes so plugin getters return fresh values
    useSyncExternalStore(
      store.subscribe,
      () => store.getState(),
      () => store.getState(),
    );

    return selectorRef.current ? selectorRef.current(plugins) : plugins;
  }

  return {
    Provider,
    useStore: useStoreHook,
    useActions: useActionsHook,
    usePlugins: usePluginsHook,
  };
}
