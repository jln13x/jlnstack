import { expect, test } from "vitest";
import { createStore } from "../core";
import { definePlugin } from "./plugin";

test("plugins with duplicate ids use the last one", () => {
  const first = definePlugin((_store) => ({
    id: "counter",
    extend: { value: "first" },
  }));

  const last = definePlugin((_store) => ({
    id: "counter",
    extend: { value: "last" },
  }));

  const { plugins } = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: [first, last],
  });

  expect(plugins.counter.value).toBe("last");
});

test("duplicate plugin ids - onStateChange runs for all", () => {
  const calls: string[] = [];

  const first = definePlugin((_store) => ({
    id: "watcher",
    onStateChange: () => {
      calls.push("first");
    },
  }));

  const last = definePlugin((_store) => ({
    id: "watcher",
    onStateChange: () => {
      calls.push("last");
    },
  }));

  const { store } = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: [first, last],
  });

  store.setState({ count: 1 });

  expect(calls).toEqual(["first", "last"]);
});

test("plugin receives store api", () => {
  const { store, plugins } = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: [
      definePlugin((api) => ({
        id: "getter",
        extend: {
          getCount: () => (api.getState() as { count: number }).count,
        },
      })),
    ],
  });

  store.setState({ count: 42 });
  expect(plugins.getter.getCount()).toBe(42);
});

test("plugin can use setStateSilent to avoid onStateChange", () => {
  const calls: number[] = [];

  const { store } = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: [
      definePlugin((_store) => ({
        id: "tracker",
        onStateChange: (state) => {
          calls.push((state as { count: number }).count);
        },
      })),
    ],
  });

  store.setState({ count: 1 });
  store.setStateSilent({ count: 2 });
  store.setState({ count: 3 });

  expect(calls).toEqual([1, 3]);
});

test("multiple plugins with different ids", () => {
  const { plugins } = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: [
      definePlugin((_store) => ({
        id: "alpha",
        extend: { name: "Alpha" },
      })),
      definePlugin((_store) => ({
        id: "beta",
        extend: { name: "Beta" },
      })),
    ],
  });

  expect(plugins.alpha.name).toBe("Alpha");
  expect(plugins.beta.name).toBe("Beta");
});
