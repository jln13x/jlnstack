import { assertType, test } from "vitest";
import { history } from "./index";
import { createStore } from "../../store";
import { plugins } from "../../types";

test("history extension is properly typed", () => {
  const store = createStore({
    state: { count: 0, name: "test" },
    actions: {},
    plugins: plugins([history()]),
  });

  assertType<() => void>(store.extension.history.undo);
  assertType<() => void>(store.extension.history.redo);
  assertType<() => void>(store.extension.history.clear);
  assertType<() => boolean>(store.extension.history.canUndo);
  assertType<() => boolean>(store.extension.history.canRedo);
  assertType<() => { count: number; name: string }[]>(
    store.extension.history.pastStates,
  );
  assertType<() => { count: number; name: string }[]>(
    store.extension.history.futureStates,
  );
});
