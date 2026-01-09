import type { StoreApi } from "zustand";

export function reset() {
  return {
    id: "reset" as const,
    extend: (store: StoreApi<unknown>, initialState: unknown) => ({
      reset: () => store.setState(initialState, true),
    }),
  };
}
