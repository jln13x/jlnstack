import { createPlugin } from "../index";

export interface HistoryOptions {
  limit?: number;
}

export function history(options: HistoryOptions = {}) {
  const { limit = 100 } = options;

  const past: unknown[] = [];
  const future: unknown[] = [];
  let isUndoing = false;

  return createPlugin({
    id: "history",
    onStoreCreated: (store) => {
      store.subscribe((_state, prevState) => {
        if (isUndoing) return;

        past.push(prevState);
        if (past.length > limit) past.shift();
        future.length = 0;
      });
    },
    extend: (store) => ({
      undo: () => {
        const prev = past.pop();
        if (prev === undefined) return;

        isUndoing = true;
        future.push(store.getState());
        store.setState(prev as object, true);
        isUndoing = false;
      },
      redo: () => {
        const next = future.pop();
        if (next === undefined) return;

        isUndoing = true;
        past.push(store.getState());
        store.setState(next as object, true);
        isUndoing = false;
      },
      clear: () => {
        past.length = 0;
        future.length = 0;
      },
      canUndo: () => past.length > 0,
      canRedo: () => future.length > 0,
      pastStates: () => [...past],
      futureStates: () => [...future],
    }),
  });
}
