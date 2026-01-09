import { immer as zustandImmer } from "zustand/middleware/immer";
import { createPlugin, type PluginConfig } from "../index";

export function immer() {
  return createPlugin({
    id: "immer",
    middleware: zustandImmer as unknown as PluginConfig["middleware"],
  });
}
