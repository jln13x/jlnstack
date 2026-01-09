import { type StoreApi, createStore as zustandCreateStore } from "zustand";

export type SetState<TState> = (
  updater:
    | TState
    | Partial<TState>
    | ((state: TState) => TState | Partial<TState> | void),
  replace?: boolean,
) => void;
export type GetState<TState> = StoreApi<TState>["getState"];

// --- Plugin definition ---

export type PluginConfig<
  TId extends string = string,
  TExtension extends object = object,
  TStateConstraint extends object = object,
> = {
  id: TId;
  middleware?: (creator: () => unknown) => () => unknown;
  onStateChange?: (
    state: TStateConstraint,
    prevState: TStateConstraint,
  ) => void;
  onActionsCreated?: <T extends object>(actions: T) => T;
  extend?: (
    store: StoreApi<TStateConstraint>,
    initialState: TStateConstraint,
  ) => TExtension;
};

export type PluginInstance<
  TId extends string = string,
  TExtension extends object = object,
> = { _id: TId } & TExtension;

export type PluginFactoryFn<
  TId extends string = string,
  TExtension extends object = object,
  TStateConstraint extends object = object,
> = ((store: StoreApi<TStateConstraint>) => PluginInstance<TId, TExtension>) & {
  _middleware?: (creator: () => unknown) => () => unknown;
  _onStateChange?: (state: object, prevState: object) => void;
  _onActionsCreated?: <T extends object>(actions: T) => T;
};

export function createPlugin<
  TId extends string,
  TExtension extends object = object,
>(config: {
  id: TId;
  middleware?: (creator: () => unknown) => () => unknown;
  onStateChange?: (state: object, prevState: object) => void;
  onActionsCreated?: <T extends object>(actions: T) => T;
  extend?: (store: StoreApi<object>, initialState: object) => TExtension;
}): PluginFactoryFn<TId, TExtension, object> {
  const factory = (store: StoreApi<object>) =>
    ({
      _id: config.id,
      ...config.extend?.(store, store.getState()),
    }) as PluginInstance<TId, TExtension>;
  factory._middleware = config.middleware;
  factory._onStateChange = config.onStateChange;
  factory._onActionsCreated = config.onActionsCreated;
  return factory as PluginFactoryFn<TId, TExtension, object>;
}

// --- Store creation ---

type UnionToIntersection<U> = (
  U extends unknown
    ? (k: U) => void
    : never
) extends (k: infer I) => void
  ? I
  : never;

type InferExtensions<
  TPlugins extends readonly PluginInstance<string, object>[],
> = UnionToIntersection<
  {
    [K in keyof TPlugins]: TPlugins[K] extends PluginInstance<
      infer Id extends string,
      infer Ext
    >
      ? { [P in Id]: Ext }
      : never;
  }[number]
>;

type AnyPluginFactory = PluginFactoryFn<string, object, object>;

type PluginsCallback<
  TState extends object,
  TPlugins extends PluginInstance<string, object>[],
> = ((store: StoreApi<TState>) => TPlugins) & {
  _factories?: AnyPluginFactory[];
};

export function createStore<
  TState extends object,
  const TPlugins extends PluginInstance<string, object>[],
>(config: { state: TState; plugins: PluginsCallback<TState, TPlugins> }) {
  const factories = config.plugins._factories ?? [];

  // Apply middleware
  const creator = () => config.state;
  const wrappedCreator = factories.reduce(
    (acc, factory) => (factory._middleware?.(acc) ?? acc) as () => TState,
    creator,
  );

  const store = zustandCreateStore<TState>(wrappedCreator);

  // Subscribe to state changes
  const stateChangeCallbacks = factories
    .map((f) => f._onStateChange)
    .filter(Boolean);
  if (stateChangeCallbacks.length > 0) {
    store.subscribe((state, prevState) => {
      for (const cb of stateChangeCallbacks) {
        cb?.(state, prevState);
      }
    });
  }

  // Create plugin instances
  const pluginInstances = config.plugins(store);

  // Collect extensions
  const extensions = pluginInstances.reduce(
    (acc, plugin) => {
      const { _id, ...rest } = plugin;
      acc[_id] = rest;
      return acc;
    },
    {} as Record<string, object>,
  );

  return {
    store,
    extensions: extensions as InferExtensions<TPlugins>,
    getState: store.getState,
    setState: store.setState as SetState<TState>,
    subscribe: store.subscribe,
  };
}

// --- Plugin helper for cleaner syntax ---

type InferPluginsResult<TFactories extends readonly AnyPluginFactory[]> = {
  [K in keyof TFactories]: TFactories[K] extends PluginFactoryFn<
    infer Id,
    infer Ext,
    object
  >
    ? PluginInstance<Id, Ext>
    : never;
};

export function plugins<
  TState extends object,
  const TFactories extends AnyPluginFactory[],
>(
  factories: TFactories,
): PluginsCallback<TState, InferPluginsResult<TFactories>> {
  const callback = ((store: StoreApi<TState>) =>
    factories.map((f) => f(store))) as PluginsCallback<
    TState,
    InferPluginsResult<TFactories>
  >;
  callback._factories = factories;
  return callback;
}
