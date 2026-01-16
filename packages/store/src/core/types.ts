export type SetState<TState> = (
  updater: TState | ((state: TState) => TState | void),
) => void;

export type StoreApi<TState> = {
  setState: SetState<TState>;
  setStateSilent: (state: TState) => void;
  getState: () => TState;
  subscribe: (listener: () => void) => () => void;
};

export type {
  ExtractExtensions,
  Middleware,
  PluginResult,
} from "./plugins/plugin";

export type { Plugin } from "./plugins/types";

export { plugins } from "./plugins/utils";

export type Store<
  TState,
  TActions,
  TResults extends import("./plugins/plugin").PluginResult[],
> = {
  state: TState;
  actions: TActions;
  store: StoreApi<TState>;
  extension: import("./plugins/plugin").ExtractExtensions<TResults>;
};
