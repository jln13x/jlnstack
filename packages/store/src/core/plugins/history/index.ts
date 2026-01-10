import type { StoreApi } from "../../types";
import { definePlugin } from "../v2";

export interface HistoryOptions {
  limit?: number;
}

export function history(options: HistoryOptions = {}) {
  const { limit = 100 } = options;

  return definePlugin(<TState>(store: StoreApi<TState>) => {
    const past: TState[] = [];
    const future: TState[] = [];

    return {
      id: "history",
      onStateChange: (_state: TState, prevState: TState) => {
        past.push(prevState);
        if (past.length > limit) past.shift();
        future.length = 0;
      },
      extend: {
        undo: () => {
          const prev = past.pop();
          if (prev === undefined) return;

          future.push(store.getState());
          store.setStateSilent(prev);
        },
        redo: () => {
          const next = future.pop();
          if (next === undefined) return;

          past.push(store.getState());
          store.setStateSilent(next);
        },
        clear: () => {
          past.length = 0;
          future.length = 0;
        },
        canUndo: () => past.length > 0,
        canRedo: () => future.length > 0,
        pastStates: () => [...past],
        futureStates: () => [...future],
      },
    };
  });
}
