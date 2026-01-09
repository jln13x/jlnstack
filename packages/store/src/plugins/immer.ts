import { immer as zustandImmer } from "zustand/middleware/immer";
import { createPlugin, type Plugin } from "../index";

export function immer() {
  return createPlugin({
    id: "immer",
    middleware: zustandImmer as unknown as Plugin["middleware"],
  });
}
