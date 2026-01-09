import type { AnyStorePlugin } from "./types";

export function reset() {
  return {
    id: "reset",
    extend: (store, initialState) => ({
      reset: () => store.setState(initialState, true),
    }),
  } satisfies AnyStorePlugin;
}
