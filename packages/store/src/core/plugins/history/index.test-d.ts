import { assertType, test } from "vitest";
import { createStore } from "../../core";
import { history } from "./index";

test("history extension is properly typed", () => {
  const store = createStore({
    state: { count: 0, name: "test" },
    actions: () => ({}),
    plugins: [history()],
  });

  assertType<() => void>(store.plugins.history.undo);
  assertType<() => void>(store.plugins.history.redo);
  assertType<() => void>(store.plugins.history.clear);
  assertType<() => boolean>(store.plugins.history.canUndo);
  assertType<() => boolean>(store.plugins.history.canRedo);
  assertType<() => { count: number; name: string }[]>(
    store.plugins.history.pastStates,
  );
  assertType<() => { count: number; name: string }[]>(
    store.plugins.history.futureStates,
  );
});

test("futureStates is not any", () => {
  type IsAny<T> = 0 extends 1 & T ? true : false;

  const store = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: [history()],
  });

  type FutureStatesItem = ReturnType<
    typeof store.plugins.history.futureStates
  >[number];
  assertType<false>({} as IsAny<FutureStatesItem>);
});
