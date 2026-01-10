import type { Plugin } from "../../types";

export function reset() {
  return ((store) => {
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
  }) satisfies Plugin;
}
