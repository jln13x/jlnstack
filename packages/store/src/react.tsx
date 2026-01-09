import { createContext, type ReactNode, useContext, useState } from "react";
import { type StoreApi, useStore } from "zustand";
import {
  createStore as createCoreStore,
  type GetState,
  type SetState,
} from "./index";
import type { ReactPlugin } from "./plugins/react";

type UnionToIntersection<U> = (
  U extends unknown
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never;

type ExtractPluginExtension<P> = P extends ReactPlugin<infer Id, infer E>
  ? E extends Record<string, never>
    ? never
    : { [K in Id]: E }
  : never;

type InferExtensions<T> = T extends readonly unknown[]
  ? UnionToIntersection<ExtractPluginExtension<T[number]>> extends infer R
    ? R extends object
      ? R
      : object
    : object
  : object;

interface StoreConfig<
  TInitialState,
  TState extends object,
  TActions extends object,
  TPlugins extends ReactPlugin<string, any, TState>[],
> {
  name: string;
  state: (initialState: TInitialState) => TState;
  actions: (set: SetState<TState>, get: GetState<TState>) => TActions;
  plugins?: {
    [K in keyof TPlugins]: TPlugins[K] & ReactPlugin<string, any, TState>;
  };
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
  const TPlugins extends ReactPlugin<string, any, TState>[] = [],
>(
  config: StoreConfig<TInitialState, TState, TActions, TPlugins>,
): Store<TState, TActions, TInitialState, InferExtensions<TPlugins>> {
  const Context = createContext<{
    store: StoreApi<TState>;
    actions: TActions;
    extensions: InferExtensions<TPlugins>;
  } | null>(null);

  const Provider = ({
    initialState,
    children,
  }: ProviderProps<TInitialState>) => {
    const [value] = useState(() => {
      const { store, actions, extensions } = createCoreStore({
        state: config.state(initialState),
        actions: config.actions,
        plugins: config.plugins as any,
      });
      return {
        store,
        actions,
        extensions: extensions as InferExtensions<TPlugins>,
      };
    });

    config.plugins?.forEach((plugin) => {
      // biome-ignore lint/correctness/useHookAtTopLevel: should be fine
      plugin.useHook?.(value.store);
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
