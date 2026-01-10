import { expect, test } from "vitest";
import { createStore } from "../core";
import type { Plugin } from "../types";
import { plugins } from "./utils";

test("plugins with duplicate ids use the last one", () => {
  const first = ((_store) => ({
    id: "counter",
    extend: { value: "first" },
  })) satisfies Plugin;

  const last = ((_store) => ({
    id: "counter",
    extend: { value: "last" },
  })) satisfies Plugin;

  const { extension } = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: plugins([first, last]),
  });

  expect(extension.counter.value).toBe("last");
});

test("duplicate plugin ids - onStateChange runs for all", () => {
  const calls: string[] = [];

  const first = ((_store) => ({
    id: "watcher",
    onStateChange: () => {
      calls.push("first");
    },
  })) satisfies Plugin;

  const last = ((_store) => ({
    id: "watcher",
    onStateChange: () => {
      calls.push("last");
    },
  })) satisfies Plugin;

  const { store } = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: plugins([first, last]),
  });

  store.setState({ count: 1 });

  expect(calls).toEqual(["first", "last"]);
});

test("plugin receives store api", () => {
  const { store, extension } = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: plugins([
      ((api) => ({
        id: "getter",
        extend: {
          getCount: () => api.getState().count,
        },
      })) satisfies Plugin,
    ]),
  });

  store.setState({ count: 42 });
  expect(extension.getter.getCount()).toBe(42);
});

test("plugin can use setStateSilent to avoid onStateChange", () => {
  const calls: number[] = [];

  const { store } = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: plugins([
      (_store) => ({
        id: "tracker",
        onStateChange: (state) => {
          calls.push((state as { count: number }).count);
        },
      }),
    ]),
  });

  store.setState({ count: 1 });
  store.setStateSilent({ count: 2 });
  store.setState({ count: 3 });

  expect(calls).toEqual([1, 3]);
});

test("multiple plugins with different ids", () => {
  const { extension } = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: plugins([
      (_store) => ({
        id: "alpha",
        extend: { name: "Alpha" },
      }),
      (_store) => ({
        id: "beta",
        extend: { name: "Beta" },
      }),
    ]),
  });

  expect(extension.alpha.name).toBe("Alpha");
  expect(extension.beta.name).toBe("Beta");
});
