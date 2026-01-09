import { assertType, test } from "vitest";
import { createStore } from "../../src/index";
import { history } from "../../src/plugins/history";

test("history extension is properly typed", () => {
  type State = { count: number; name: string };

  const store = createStore({
    state: { count: 0, name: "test" } satisfies State,
    plugins: [history()],
  });

  assertType<() => void>(store.extensions.history.undo);
  assertType<() => void>(store.extensions.history.redo);
  assertType<() => void>(store.extensions.history.clear);
  assertType<() => boolean>(store.extensions.history.canUndo);
  assertType<() => boolean>(store.extensions.history.canRedo);
  assertType<() => State[]>(store.extensions.history.pastStates);
  assertType<() => State[]>(store.extensions.history.futureStates);
});
