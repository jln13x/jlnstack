import { assertType, test } from "vitest";
import { createPlugin, createStore, plugins } from "../src/index";

const bazPlugin = createPlugin({
  id: "baz",
  extend: () => ({
    baz: () => "baz",
  }),
});

test("plugin extends store with inferred type", () => {
  const fooPlugin = createPlugin({
    id: "foo",
    extend: () => ({ foo: () => "foo" }),
  });

  const barPlugin = createPlugin({
    id: "bar",
    extend: () => ({ bar: () => "bar" }),
  });

  const counterPlugin = createPlugin({
    id: "counter",
    extend: (store) => ({
      increment: (by: number) =>
        store.setState((s) => ({ count: (s as { count: number }).count + by })),
    }),
  });

  const store = createStore({
    state: { count: 0 },
    plugins: plugins([fooPlugin, barPlugin, counterPlugin, bazPlugin]),
  });

  assertType<{
    foo: { foo: () => string };
    bar: { bar: () => string };
    counter: { increment: (by: number) => void };
    baz: { baz: () => string };
  }>(store.extensions);
});
