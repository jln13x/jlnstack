import { assertType, test } from "vitest";
import { createPlugin, createStore, type Plugin } from "../src/index";

const bazPlugin = createPlugin({
  id: "baz",
  extend: () => ({
    baz: () => "baz",
  }),
});

test("inline plugin extends store with inferred type", () => {
  const store = createStore({
    state: { count: 0 },
    plugins: [
      {
        id: "foo",
        extend: () => ({
          foo: () => "foo",
        }),
      },
      {
        id: "bar",
        extend: () => ({
          bar: () => "bar",
        }),
      },
      {
        id: "counter",
        extend: (store) => ({
          increment: (by: number) =>
            store.setState((s) => ({ count: s.count + by })),
        }),
      },
      bazPlugin,
    ],
  });

  assertType<{
    foo: { foo: () => string };
    bar: { bar: () => string };
    counter: { increment: (by: number) => void };
    baz: { baz: () => string };
  }>(store.extensions);
});

test("plugin with state constraint", () => {
  const counter2 = {
    id: "counter2",
    extend: (store) => ({
      increment: (by: number) =>
        store.setState((s) => ({ count: s.count + by })),
    }),
  } satisfies Plugin<{ count: number }>;

  // Success: store has { count: number }
  createStore({
    state: { count: 0 },
    plugins: [counter2],
  });

  // Failure: store missing count
  createStore({
    state: { name: "test" },
    // @ts-expect-error - counter2 requires { count: number } in state
    plugins: [counter2],
  });
});
