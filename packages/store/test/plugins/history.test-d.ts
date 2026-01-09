import { assertType, test } from "vitest";
import { createStore } from "../../src/core/store";
import { history } from "../../src/plugins/history";

test("history extension is properly typed", () => {
  const store = createStore({
    state: { count: 0, name: "test" },
    actions: {},
    plugins: (api) => {
      const h = history()(api);
      return [h];
    },
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
