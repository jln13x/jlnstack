export type SetState<TState> = (
  updater: TState | ((state: TState) => TState | void),
) => void;

export type StoreApi<TState> = {
  setState: SetState<TState>;
  setStateSilent: (state: TState) => void;
  getState: () => TState;
};

export type {
  ExtractExtensions,
  Middleware,
  Plugin,
  PluginResult,
} from "./plugins/types";

export type Store<
  TState,
  TActions,
  TPlugins extends import("./plugins/types").PluginResult[],
> = {
  state: TState;
  actions: TActions;
  store: StoreApi<TState>;
  extension: import("./plugins/types").ExtractExtensions<TPlugins>;
};
