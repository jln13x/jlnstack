import { type StoreApi, createStore as zustandCreateStore } from "zustand";
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

export type Plugin<TState extends object = object> = {
  id: string;
  middleware?: (creator: () => unknown) => () => unknown;
  onStateChange?: (state: TState, prevState: TState) => void;
  onActionsCreated?: <T extends object>(actions: T) => T;
  extend?: (store: StoreApi<TState>, initialState: TState) => object;
};

export function createPlugin<const T extends Plugin>(plugin: T): T {
  return plugin;
}

declare const STATE_MARKER: unique symbol;
export type StateMarker = { readonly [STATE_MARKER]: true };

type SubstituteState<T, TState> = T extends StateMarker
  ? TState
  : T extends (...args: infer A) => infer R
    ? (...args: A) => SubstituteState<R, TState>
    : T extends readonly (infer U)[]
      ? SubstituteState<U, TState>[]
      : T extends object
        ? { [K in keyof T]: SubstituteState<T[K], TState> }
        : T;

type UnionToIntersection<U> = (
  U extends unknown
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never;

type ExtractPluginExtension<P, TState> = P extends {
  id: infer Id extends string;
  // biome-ignore lint/suspicious/noExplicitAny: needed for inference
  extend?: (...args: any[]) => infer E;
}
  ? [E] extends [undefined]
    ? never
    : { [K in Id]: SubstituteState<E, TState> }
  : never;

type InferExtensions<T, TState> = T extends readonly unknown[]
  ? UnionToIntersection<
      ExtractPluginExtension<T[number], TState>
    > extends infer R
    ? R extends object
      ? R
      : object
    : object
  : object;

type AnyPlugin = {
  id: string;
  middleware?: (creator: () => unknown) => () => unknown;
  // biome-ignore lint/suspicious/noExplicitAny: needed for plugin compatibility
  onStateChange?: (state: any, prevState: any) => void;
  onActionsCreated?: <T extends object>(actions: T) => T;
  // biome-ignore lint/suspicious/noExplicitAny: needed for inference
  extend?: (store: StoreApi<any>, initialState: any) => object;
};

export function createStore<
  TState extends object,
  TActions extends object = Record<string, never>,
  const TPlugins extends AnyPlugin[] = AnyPlugin[],
>(config: {
  state: TState;
  actions?: (set: SetState<TState>, get: GetState<TState>) => TActions;
  plugins?: { [K in keyof TPlugins]: TPlugins[K] & Plugin<TState> };
}) {
  const creator = () => config.state;
  const wrappedCreator =
    config.plugins?.reduce(
      (acc, plugin) => (plugin.middleware?.(acc) ?? acc) as () => TState,
      creator,
    ) ?? creator;

  const store = zustandCreateStore<TState>(wrappedCreator);

  const plugins = config.plugins as Plugin<TState>[] | undefined;

  store.subscribe((state, prevState) => {
    plugins?.forEach((plugin) => {
      plugin.onStateChange?.(state, prevState);
    });
  });

  let actions =
    config.actions?.(store.setState as SetState<TState>, store.getState) ??
    ({} as TActions);

  plugins?.forEach((plugin) => {
    if (plugin.onActionsCreated) {
      actions = plugin.onActionsCreated(actions);
    }
  });

  const extensions =
    plugins?.reduce(
      (acc, plugin) => {
        if (plugin.extend) {
          acc[plugin.id] = plugin.extend(store, config.state);
        }
        return acc;
      },
      {} as Record<string, unknown>,
    ) ?? {};

  return {
    store,
    actions,
    extensions: extensions as InferExtensions<TPlugins, TState>,
    getState: store.getState,
    setState: store.setState as SetState<TState>,
    subscribe: store.subscribe,
  };
}
