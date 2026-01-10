import { createContext, type ReactNode, useContext, useState } from "react";
import {
  useStore,
  type StoreApi as ZustandStoreApi,
  createStore as zustandCreateStore,
} from "zustand";
import type { StoreOptions } from "../core/core";
import type {
  StoreApi as CoreStoreApi,
  PluginResult,
  SetState,
} from "../core/types";

type ReactPluginResult = PluginResult & {
  useHook?: () => unknown;
};

type ReactPlugin = (store: CoreStoreApi<any>) => ReactPluginResult;

type ExtractExtensions<TPlugins extends ReactPluginResult[]> = {
  [K in TPlugins[number] as K["id"]]: K extends { extend: infer E } ? E : never;
};

type ReactStoreOptions<
  TInitialState,
  TState,
  TActions,
  TPlugins extends ReactPluginResult[],
> = Omit<
  StoreOptions<TState, TActions, TPlugins>,
  "state" | "actions" | "plugins"
> & {
  name: string;
  state: (initialState: TInitialState) => TState;
  actions: (set: SetState<TState>, get: () => TState) => TActions;
  plugins?: (store: CoreStoreApi<TState>) => TPlugins;
};

interface ProviderProps<TInitialState> {
  initialState: TInitialState;
  children: ReactNode;
}

interface Store<
  TState extends object,
  TActions extends object,
  TInitialState,
  TExtensions extends object,
> {
  Provider: (props: ProviderProps<TInitialState>) => ReactNode;
  useStore: <TSelected>(selector: (state: TState) => TSelected) => TSelected;
  useActions: () => TActions;
  useExtensions: () => TExtensions;
}

export function createStore<
  TInitialState,
  TState extends object,
  TActions extends object,
  const TPlugins extends ReactPluginResult[] = [],
>(
  config: ReactStoreOptions<TInitialState, TState, TActions, TPlugins>,
): Store<TState, TActions, TInitialState, ExtractExtensions<TPlugins>> {
  type Extensions = ExtractExtensions<TPlugins>;

  const Context = createContext<{
    zustandStore: ZustandStoreApi<TState>;
    actions: TActions;
    extensions: Extensions;
  } | null>(null);

  const Provider = ({
    initialState,
    children,
  }: ProviderProps<TInitialState>) => {
    const [value] = useState(() => {
      const state = config.state(initialState);

      const zustandStore = zustandCreateStore<TState>(() => state);

      const coreStoreApi: CoreStoreApi<TState> = {
        getState: zustandStore.getState,
        setState: zustandStore.setState as SetState<TState>,
        setStateSilent: (newState) => zustandStore.setState(newState, true),
      };

      const pluginResults =
        config.plugins?.(coreStoreApi) ?? ([] as unknown as TPlugins);

      const stateChangeCallbacks = pluginResults
        .map((p) => p.onStateChange)
        .filter((cb): cb is NonNullable<typeof cb> => cb != null);

      if (stateChangeCallbacks.length > 0) {
        zustandStore.subscribe((state, prevState) => {
          for (const cb of stateChangeCallbacks) {
            cb(state, prevState);
          }
        });
      }

      const extensions = {} as Extensions;
      for (const plugin of pluginResults) {
        if ("extend" in plugin && plugin.extend) {
          (extensions as Record<string, unknown>)[plugin.id] = plugin.extend;
        }
      }

      const actions = config.actions(
        coreStoreApi.setState,
        coreStoreApi.getState,
      );

      return {
        zustandStore,
        actions,
        extensions,
      };
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
  ): TSelected => useStore(useCtx().zustandStore, selector);

  const useActionsHook = (): TActions => useCtx().actions;

  const useExtensionsHook = () => useCtx().extensions;

  return {
    Provider,
    useStore: useStoreHook,
    useActions: useActionsHook,
    useExtensions: useExtensionsHook,
  };
}

export type { ReactPlugin, ReactPluginResult };
