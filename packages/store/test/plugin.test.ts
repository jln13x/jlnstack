import { expect, test } from "vitest";
import { createStore } from "../src/index";

test("plugins with duplicate ids use the last one", () => {
  const store = createStore({
    state: { count: 0 },
    plugins: [
      {
        id: "counter",
        extend: () => ({
          value: "first",
        }),
      },
      {
        id: "counter",
        extend: () => ({
          value: "last",
        }),
      },
    ],
  });

  expect(store.extensions.counter.value).toBe("last");
});

test("duplicate plugin ids - middleware runs for all", () => {
  const calls: string[] = [];

  createStore({
    state: { count: 0 },
    plugins: [
      {
        id: "logger",
        middleware: (creator) => () => {
          calls.push("first");
          return creator();
        },
      },
      {
        id: "logger",
        middleware: (creator) => () => {
          calls.push("last");
          return creator();
        },
      },
    ],
  });

  expect(calls).toEqual(["last", "first"]);
});

test("duplicate plugin ids - onStateChange runs for all", () => {
  const calls: string[] = [];

  const { setState } = createStore({
    state: { count: 0 },
    plugins: [
      {
        id: "watcher",
        onStateChange: () => {
          calls.push("first");
        },
      },
      {
        id: "watcher",
        onStateChange: () => {
          calls.push("last");
        },
      },
    ],
  });

  setState({ count: 1 });

  expect(calls).toEqual(["first", "last"]);
});
