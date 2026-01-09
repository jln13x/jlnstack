export type StoreApi<TState> = {
  setState: (state: TState) => void;
  setStateSilent: (state: TState) => void;
  getState: () => TState;
};

type LiteralString = "" | (string & Record<never, never>);

export type PluginResult<TState = unknown> = {
  id: LiteralString;
  onStateChange?: (state: TState, prevState: TState) => void;
};

export type Plugin = (store: StoreApi<any>) => PluginResult;

type PluginsReturn<TPlugins extends Plugin[]> = {
  [K in keyof TPlugins]: TPlugins[K] extends Plugin
    ? ReturnType<TPlugins[K]>
    : never;
};

export function plugins<TPlugins extends Plugin[]>(
  pluginFactories: [...TPlugins],
) {
  return <TState>(store: StoreApi<TState>): PluginsReturn<TPlugins> =>
    pluginFactories.map((factory) => factory(store)) as PluginsReturn<TPlugins>;
}

type ExtractExtensions<TPlugins extends PluginResult[]> = {
  [K in TPlugins[number] as K["id"]]: K extends { extend: infer E } ? E : never;
};

export type Store<TState, TActions, TPlugins extends PluginResult[]> = {
  state: TState;
  actions: TActions;
  store: StoreApi<TState>;
  extension: ExtractExtensions<TPlugins>;
};
