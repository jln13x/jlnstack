import { expect, test } from "vitest";
import { createPlugin, createStore, plugins } from "../src/index";

test("plugins with duplicate ids use the last one", () => {
  const first = createPlugin({
    id: "counter",
    extend: () => ({ value: "first" }),
  });

  const last = createPlugin({
    id: "counter",
    extend: () => ({ value: "last" }),
  });

  const store = createStore({
    state: { count: 0 },
    plugins: plugins([first, last]),
  });

  expect(store.extensions.counter.value).toBe("last");
});

test("duplicate plugin ids - middleware runs for all", () => {
  const calls: string[] = [];

  const first = createPlugin({
    id: "logger",
    middleware: (creator) => () => {
      calls.push("first");
      return creator();
    },
  });

  const last = createPlugin({
    id: "logger",
    middleware: (creator) => () => {
      calls.push("last");
      return creator();
    },
  });

  createStore({
    state: { count: 0 },
    plugins: plugins([first, last]),
  });

  expect(calls).toEqual(["last", "first"]);
});

test("duplicate plugin ids - onStateChange runs for all", () => {
  const calls: string[] = [];

  const first = createPlugin({
    id: "watcher",
    onStateChange: () => {
      calls.push("first");
    },
  });

  const last = createPlugin({
    id: "watcher",
    onStateChange: () => {
      calls.push("last");
    },
  });

  const { setState } = createStore({
    state: { count: 0 },
    plugins: plugins([first, last]),
  });

  setState({ count: 1 });

  expect(calls).toEqual(["first", "last"]);
});
