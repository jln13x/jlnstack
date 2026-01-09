export type StoreApi<TState> = {
  setState: (state: TState) => void;
  getState: () => TState;
};

type LiteralString = "" | (string & Record<never, never>);

export type PluginResult = {
  id: LiteralString;
};

export type PluginsFn = (store: StoreApi<any>) => PluginResult[];

export type Plugin = (store: StoreApi<any>) => PluginResult;

type ExtractExtensions<TPlugins extends PluginResult[]> = {
  [K in TPlugins[number] as K["id"]]: K extends { extend: infer E } ? E : never;
};

export type Store<TState, TActions, TPlugins extends PluginResult[]> = {
  state: TState;
  actions: TActions;
  store: StoreApi<TState>;
  extension: ExtractExtensions<TPlugins>;
};
