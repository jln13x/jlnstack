import type { ExtractPlugins, PluginResult } from "./plugins/plugin";

export type SetState<TState> = (
  updater: TState | ((state: TState) => TState),
) => void;

export type StoreApi<TState> = {
  setState: SetState<TState>;
  setStateSilent: (state: TState) => void;
  getState: () => TState;
  subscribe: (listener: () => void) => () => void;
};

export type {
  ExtractPlugins,
  Middleware,
  PluginResult,
} from "./plugins/plugin";

export type Store<TState, TActions, TResults extends PluginResult[]> = {
  state: TState;
  actions: TActions;
  store: StoreApi<TState>;
  plugins: ExtractPlugins<TResults>;
  pluginResults: TResults;
};
