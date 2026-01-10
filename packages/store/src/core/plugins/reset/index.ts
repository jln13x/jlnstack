import type { StoreApi } from "../../types";
import { definePlugin } from "../plugin";

export function reset() {
  return definePlugin(<TState>(store: StoreApi<TState>) => {
    let changed = false;
    const initialState = store.getState();
    return {
      id: "reset",
      onStateChange: () => {
        changed = true;
      },
      extend: {
        reset: () => {
          store.setState(initialState);
          changed = false;
          return initialState;
        },
        canReset: () => {
          return changed;
        },
      },
    };
  });
}
