import { assertType, test } from "vitest";
import { createStore } from "../core";
import type { SetState, StoreApi } from "../types";
import { history } from "./history";
import { definePlugin } from "./plugin";

type IsAny<T> = 0 extends 1 & T ? true : false;

const bazPlugin = () =>
  definePlugin(() => ({
    id: "baz",
    extend: { baz: () => "baz" },
  }));

test("plugin extends store with inferred type", () => {
  const fooPlugin = () =>
    definePlugin(() => ({
      id: "foo",
      extend: { foo: () => "foo" },
    }));

  const barPlugin = () =>
    definePlugin(() => ({
      id: "bar",
      extend: { bar: () => "bar" },
    }));

  const counterPlugin = () =>
    definePlugin(<TState>(_store: StoreApi<TState>) => ({
      id: "counter",
      extend: {
        increment: (_by: number) => {},
      },
    }));

  const store = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: [fooPlugin(), barPlugin(), counterPlugin(), bazPlugin()],
  });

  assertType<{
    foo: { foo: () => string };
    bar: { bar: () => string };
    counter: { increment: (by: number) => void };
    baz: { baz: () => string };
  }>(store.plugins);
});

// ============================================
// Test: history plugin with definePlugin
// ============================================

test("history plugin preserves TState with definePlugin", () => {
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

test("futureStates is not any with new plugin system", () => {
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

// ============================================
// Test: Custom plugins with definePlugin
// ============================================

function resetPlugin() {
  return definePlugin(<TState>(store: StoreApi<TState>) => {
    const initialState = store.getState();
    return {
      id: "reset",
      extend: {
        reset: () => store.setState(initialState),
        getInitial: () => initialState,
      },
    };
  });
}

function loggerPlugin(prefix: string) {
  return definePlugin(<TState>(_store: StoreApi<TState>) => {
    const logs: { state: TState; prev: TState }[] = [];
    return {
      id: "logger",
      onStateChange: (state: TState, prev: TState) => {
        console.log(prefix, { state, prev });
        logs.push({ state, prev });
      },
      extend: {
        getLogs: () => logs,
      },
    };
  });
}

test("multiple plugins preserve types", () => {
  const store = createStore({
    state: { count: 0, items: ["a", "b"] },
    actions: () => ({}),
    plugins: [history(), resetPlugin(), loggerPlugin("test:")],
  });

  // History extension
  type HistoryFuture = ReturnType<typeof store.plugins.history.futureStates>;
  assertType<{ count: number; items: string[] }[]>({} as HistoryFuture);
  assertType<false>({} as IsAny<HistoryFuture[number]>);

  // Reset extension
  type ResetInitial = ReturnType<typeof store.plugins.reset.getInitial>;
  assertType<{ count: number; items: string[] }>({} as ResetInitial);
  assertType<false>({} as IsAny<ResetInitial>);

  // Logger extension
  type LoggerLogs = ReturnType<typeof store.plugins.logger.getLogs>;
  assertType<
    {
      state: { count: number; items: string[] };
      prev: { count: number; items: string[] };
    }[]
  >({} as LoggerLogs);
  assertType<false>({} as IsAny<LoggerLogs[number]>);
});

// ============================================
// Test: Actual usage without casts
// ============================================

test("actual usage without type casts", () => {
  const store = createStore({
    state: { count: 0, name: "hello" },
    actions: () => ({}),
    plugins: [history(), resetPlugin()],
  });

  // Access future states - should be { count: number; name: string }[]
  const futures = store.plugins.history.futureStates();
  const firstFuture = futures[0];
  if (firstFuture) {
    const _count: number = firstFuture.count;
    const _name: string = firstFuture.name;
    // @ts-expect-error - nope doesn't exist
    const _nope = firstFuture.nope;
  }

  // Access initial state from reset - should be { count: number; name: string }
  const initial = store.plugins.reset.getInitial();
  const _initialCount: number = initial.count;
  const _initialName: string = initial.name;
  // @ts-expect-error - missing doesn't exist
  const _missing = initial.missing;

  // Call reset - should accept no args
  store.plugins.reset.reset();

  // Access past states
  const pasts = store.plugins.history.pastStates();
  pasts.forEach((state) => {
    const _c: number = state.count;
    const _n: string = state.name;
  });
});

// ============================================
// Test: definePlugin provides type safety
// ============================================

test("definePlugin validates plugin shape", () => {
  // Valid plugin
  const _validPlugin = definePlugin(<TState>(store: StoreApi<TState>) => ({
    id: "valid",
    extend: {
      doSomething: () => store.getState(),
    },
  }));

  // @ts-expect-error - missing id
  const _missingId = definePlugin(<TState>(_store: StoreApi<TState>) => ({
    extend: {},
  }));

  // Plugin with middleware
  const _withMiddleware = definePlugin(<TState>(_store: StoreApi<TState>) => ({
    id: "middleware",
    middleware: (setState: SetState<TState>, getState: () => TState) => {
      return (updater: TState | ((s: TState) => TState)) => {
        console.log("before", getState());
        setState(updater);
        console.log("after", getState());
      };
    },
    extend: {},
  }));
});
