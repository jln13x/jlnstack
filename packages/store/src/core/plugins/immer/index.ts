import { produce } from "immer";
import type { StoreApi } from "../../types";
import { definePlugin } from "../plugin";

export function immer() {
  return definePlugin(<TState>(_store: StoreApi<TState>) => ({
    id: "immer",
    middleware: (setState, getState) => (updater: unknown) => {
      if (typeof updater === "function") {
        setState(produce(getState(), updater as (draft: any) => void));
      } else {
        setState(updater);
      }
    },
  }));
}
