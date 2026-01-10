import { produce } from "immer";
import type { Plugin } from "../../types";

export function immer() {
  return ((_store) => ({
    id: "immer",
    middleware: (setState, getState) => (updater: unknown) => {
      if (typeof updater === "function") {
        setState(produce(getState(), updater as (draft: any) => void));
      } else {
        setState(updater);
      }
    },
  })) satisfies Plugin;
}
