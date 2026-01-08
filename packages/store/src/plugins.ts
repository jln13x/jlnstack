import { immer as zustandImmer } from "zustand/middleware/immer";

export type StorePlugin = {
  middleware: (creator: () => unknown) => () => unknown;
};

export function immer(): StorePlugin {
  return {
    middleware: zustandImmer as unknown as StorePlugin["middleware"],
  };
}
