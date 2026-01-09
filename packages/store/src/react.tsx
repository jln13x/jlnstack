import { createContext, type ReactNode, useContext, useState } from "react";
import { type StoreApi, useStore } from "zustand";
import {
  createStore as createCoreStore,
  plugins as corePlugins,
  type GetState,
  type PluginFactoryFn,
  type PluginInstance,
  type SetState,
} from "./index";

type UnionToIntersection<U> = (
  U extends unknown
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never;

type AnyPluginFactory = PluginFactoryFn<string, object, object>;

type InferExtensions<TPlugins extends readonly PluginInstance<string, object>[]> =
  UnionToIntersection<
    {
      [K in keyof TPlugins]: TPlugins[K] extends PluginInstance<
        infer Id extends string,
        infer Ext
      >
        ? { [P in Id]: Ext }
        : never;
    }[number]
  > extends infer R
    ? R extends object
      ? R
      : object
    : object;

type InferPluginsResult<TFactories extends readonly AnyPluginFactory[]> = {
  [K in keyof TFactories]: TFactories[K] extends PluginFactoryFn<
    infer Id,
    infer Ext,
    object
  >
    ? PluginInstance<Id, Ext>
    : never;
};

interface StoreConfig<
  TInitialState,
  TState extends object,
  TActions extends object,
  TPlugins extends AnyPluginFactory[],
> {
  name: string;
  state: (initialState: TInitialState) => TState;
  actions: (set: SetState<TState>, get: GetState<TState>) => TActions;
  plugins?: TPlugins;
}

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
  const TPlugins extends AnyPluginFactory[] = [],
>(
  config: StoreConfig<TInitialState, TState, TActions, TPlugins>,
): Store<
  TState,
  TActions,
  TInitialState,
  InferExtensions<InferPluginsResult<TPlugins>>
> {
  type Extensions = InferExtensions<InferPluginsResult<TPlugins>>;

  const Context = createContext<{
    store: StoreApi<TState>;
    actions: TActions;
    extensions: Extensions;
  } | null>(null);

  const Provider = ({
    initialState,
    children,
  }: ProviderProps<TInitialState>) => {
    const [value] = useState(() => {
      const state = config.state(initialState);
      const store = createCoreStore({
        state,
        plugins: corePlugins(config.plugins ?? []),
      });

      const actions = config.actions(store.setState, store.getState);

      return {
        store: store.store,
        actions,
        extensions: store.extensions as Extensions,
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
  ): TSelected => useStore(useCtx().store, selector);

  const useActionsHook = (): TActions => useCtx().actions;

  const useExtensionsHook = () => useCtx().extensions;

  return {
    Provider,
    useStore: useStoreHook,
    useActions: useActionsHook,
    useExtensions: useExtensionsHook,
  };
}
