import { assertType, test } from "vitest";
import { createStore } from "../../core";
import { plugins } from "../../types";
import { history } from "./index";

test("history extension is properly typed", () => {
  const store = createStore({
    state: { count: 0, name: "test" },
    actions: () => ({}),
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

test("futureStates is not any", () => {
  type IsAny<T> = 0 extends 1 & T ? true : false;

  const store = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: plugins([history()]),
  });

  type FutureStatesItem = ReturnType<
    typeof store.extension.history.futureStates
  >[number];
  assertType<false>({} as IsAny<FutureStatesItem>);
});
