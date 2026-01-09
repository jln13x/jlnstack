import { assertType, test } from "vitest";
import { createStore, plugins } from "../../src/index";
import { history } from "../../src/plugins/history";

test("history extension is properly typed", () => {
  const store = createStore({
    state: { count: 0, name: "test" },
    plugins: plugins([history()]),
  });

  assertType<() => void>(store.extensions.history.undo);
  assertType<() => void>(store.extensions.history.redo);
  assertType<() => void>(store.extensions.history.clear);
  assertType<() => boolean>(store.extensions.history.canUndo);
  assertType<() => boolean>(store.extensions.history.canRedo);
  assertType<() => unknown[]>(store.extensions.history.pastStates);
  assertType<() => unknown[]>(store.extensions.history.futureStates);
});
