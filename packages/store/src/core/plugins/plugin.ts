import type { SetState, StoreApi } from "../types";

type LiteralString = "" | (string & Record<never, never>);

export type Middleware = (
  setState: SetState<any>,
  getState: () => any,
) => SetState<any>;

export type PluginShape = {
  id: LiteralString;
  extend?: unknown;
  onStateChange?: (state: any, prevState: any) => void;
  middleware?: Middleware;
};

export type PluginResult = PluginShape & { id: LiteralString };

export function definePlugin<
  TResult extends PluginShape,
  TFactory extends <TState>(store: StoreApi<TState>) => TResult,
>(factory: TFactory): TFactory {
  return factory;
}

export type ExtractExtensions<TResults extends PluginResult[]> = {
  [K in TResults[number] as K["id"]]: K extends { extend: infer E } ? E : never;
};
