import { immer as zustandImmer } from "zustand/middleware/immer";
import type { AnyStorePlugin, StorePlugin } from "./types";

export function immer() {
  return {
    id: "immer",
    middleware: zustandImmer as unknown as StorePlugin["middleware"],
  } satisfies AnyStorePlugin;
}
