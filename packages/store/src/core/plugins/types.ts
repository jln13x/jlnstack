import type { SetState, StoreApi } from "../types";

type LiteralString = "" | (string & Record<never, never>);

export type Middleware = (
  setState: SetState<any>,
  getState: () => any,
) => SetState<any>;

export type PluginResult = {
  id: LiteralString;
  middleware?: Middleware;
  onStateChange?: (state: any, prevState: any) => void;
};

export type Plugin = (store: StoreApi<any>) => PluginResult;

export type PluginGen<Store extends StoreApi<any>> = (
  store: Store,
) => PluginResult;

export type PluginsReturn<TPlugins extends Plugin[]> = {
  [K in keyof TPlugins]: TPlugins[K] extends Plugin
    ? ReturnType<TPlugins[K]>
    : never;
};

export type ExtractExtensions<TPlugins extends PluginResult[]> = {
  [K in TPlugins[number] as K["id"]]: K extends { extend: infer E } ? E : never;
};
