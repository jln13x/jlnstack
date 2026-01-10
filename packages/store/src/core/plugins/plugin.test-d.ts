import { assertType, test } from "vitest";
import { createStore } from "../core";
import type { Plugin } from "../types";
import { plugins } from "./utils";

const bazPlugin = () =>
  (() => ({
    id: "baz",
    extend: { baz: () => "baz" },
  })) satisfies Plugin;

test("plugin extends store with inferred type", () => {
  const fooPlugin = () =>
    (() => ({
      id: "foo",
      extend: { foo: () => "foo" },
    })) satisfies Plugin;

  const barPlugin = () =>
    (() => ({
      id: "bar",
      extend: { bar: () => "bar" },
    })) satisfies Plugin;

  const counterPlugin = () =>
    ((store) => ({
      id: "counter",
      extend: {
        increment: (by: number) =>
          store.setState((s: { count: number }) => ({ count: s.count + by })),
      },
    })) satisfies Plugin;

  const store = createStore({
    state: { count: 0 },
    actions: () => ({}),
    plugins: plugins([fooPlugin(), barPlugin(), counterPlugin(), bazPlugin()]),
  });

  assertType<{
    foo: { foo: () => string };
    bar: { bar: () => string };
    counter: { increment: (by: number) => void };
    baz: { baz: () => string };
  }>(store.extension);
});
