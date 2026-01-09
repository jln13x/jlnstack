import { immer as zustandImmer } from "zustand/middleware/immer";
import type { StorePlugin } from "./types";

export function immer() {
  return {
    id: "immer" as const,
    middleware: zustandImmer as unknown as StorePlugin["middleware"],
  };
}
