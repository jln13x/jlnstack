import type { StoreApi } from "../types";
import type { Plugin, PluginsReturn } from "./types";

export function plugins<TPlugins extends Plugin[]>(
  pluginFactories: [...TPlugins],
) {
  return <TState>(store: StoreApi<TState>): PluginsReturn<TPlugins> =>
    pluginFactories.map((factory) => factory(store)) as PluginsReturn<TPlugins>;
}
