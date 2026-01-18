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
  usePlugins: () => ExtractPlugins<TResults>;
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

    const getSnapshot = () => selectorRef.current(store.getState());

    return useSyncExternalStore(store.subscribe, getSnapshot, getSnapshot);
  };

  const useActionsHook = (): TActions => useCtx().actions;

  const usePluginsHook = (): ExtractPlugins<TResults> => {
    const { store, plugins } = useCtx();

    useSyncExternalStore(
      store.subscribe,
      () => store.getState(),
      () => store.getState(),
    );

    return plugins;
  };

  return {
    Provider,
    useStore: useStoreHook,
    useActions: useActionsHook,
    usePlugins: usePluginsHook,
  };
}
