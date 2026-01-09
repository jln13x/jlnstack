// import { createPlugin } from "../index";
import type { Plugin, StoreApi } from "../core/types";

export interface HistoryOptions {
  limit?: number;
}

export function history(options: HistoryOptions = {}) {
  const { limit = 100 } = options;

  return (<TState>(store: StoreApi<TState>) => {
    const past: TState[] = [];
    const future: TState[] = [];

    return {
      id: "history",
      extend: {
        undo: () => {
          const prev = past.pop();
          if (prev === undefined) return;

          future.push(store.getState());
          store.setState(prev);
        },
        redo: () => {
          const next = future.pop();
          if (next === undefined) return;

          past.push(store.getState());
          store.setState(next);
        },
        clear: () => {
          past.length = 0;
          future.length = 0;
        },
        canUndo: () => past.length > 0,
        canRedo: () => future.length > 0,
        pastStates: () => [...(past as TState[])],
        futureStates: () => [...(future as TState[])],
      },
    };
  }) satisfies Plugin;
}
