import type { StoreApi } from "../../types";
import { definePlugin } from "../plugin";

export function reset() {
  return definePlugin(<TState>(store: StoreApi<TState>) => {
    const initialState = store.getState();
    return {
      id: "reset",
      extend: {
        reset: () => {
          store.setState(initialState);
          return initialState;
        },
      },
    };
  });
}
