import {
  type StoreApi,
  createStore as zustandCreateStore,
  useStore as zustandUseStore,
} from "zustand";
import type {
  InferPluginExtension,
  InferPluginId,
  StorePlugin,
} from "./plugins/types";

export type SetState<TState> = (
  updater:
    | TState
    | Partial<TState>
    | ((state: TState) => TState | Partial<TState> | void),
  replace?: boolean,
) => void;
export type GetState<TState> = StoreApi<TState>["getState"];

interface StoreConfig<TState extends object, TActions extends object> {
  state: TState;
  actions?: (set: SetState<TState>, get: GetState<TState>) => TActions;
}

export type AnyPlugin = {
  id: string;
  middleware?: (creator: () => unknown) => () => unknown;
  onStoreCreated?: (store: StoreApi<unknown>) => void;
  onActionsCreated?: <T extends object>(actions: T) => T;
  extend?: (store: StoreApi<unknown>, initialState: unknown) => object;
};

export function createPlugin<const T extends AnyPlugin>(plugin: T): T {
  return plugin;
}

interface StoreOptions<TPlugins extends AnyPlugin[]> {
  plugins?: TPlugins;
}

type UnionToIntersection<U> = (
  U extends unknown
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never;

type ExtractPluginExtension<P> = P extends {
  id: infer Id extends string;
  extend?: (...args: unknown[]) => infer E;
}
  ? [E] extends [undefined]
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

export function createStore<
  TState extends object,
  TActions extends object = Record<string, never>,
  const TPlugins extends AnyPlugin[] = [],
>(config: StoreConfig<TState, TActions>, options?: StoreOptions<TPlugins>) {
  const creator = () => config.state;
  const wrappedCreator =
    options?.plugins?.reduce(
      (acc, plugin) => (plugin.middleware?.(acc) ?? acc) as () => TState,
      creator,
    ) ?? creator;

  const store = zustandCreateStore<TState>(wrappedCreator);

  options?.plugins?.forEach((plugin) => {
    plugin.onStoreCreated?.(store as StoreApi<unknown>);
  });

  let actions =
    config.actions?.(store.setState as SetState<TState>, store.getState) ??
    ({} as TActions);

  options?.plugins?.forEach((plugin) => {
    if (plugin.onActionsCreated) {
      actions = plugin.onActionsCreated(actions);
    }
  });

  const extensions =
    options?.plugins?.reduce(
      (acc, plugin) => {
        const p = plugin as StorePlugin;
        if (p.extend) {
          acc[p.id] = p.extend(store as StoreApi<unknown>, config.state);
        }
        return acc;
      },
      {} as Record<string, unknown>,
    ) ?? {};

  return {
    store,
    actions,
    extensions: extensions as InferExtensions<TPlugins>,
    getState: store.getState,
    setState: store.setState,
    subscribe: store.subscribe,
    useStore: <TSelected>(selector: (state: TState) => TSelected) =>
      zustandUseStore(store, selector),
  };
}
