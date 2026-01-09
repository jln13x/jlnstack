import { createPlugin } from "../index";

export function reset() {
  return createPlugin({
    id: "reset",
    extend: (store, initialState) => ({
      reset: () => store.setState(initialState, true),
    }),
  });
}
