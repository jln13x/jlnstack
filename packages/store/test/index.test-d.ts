import { assertType, expectTypeOf, test } from "vitest";
import { createPlugin, createStore, plugins } from "../src/index";

test("infers state type", () => {
  const { getState } = createStore({
    state: { count: 0, name: "test" },
    plugins: plugins([]),
  });

  expectTypeOf(getState()).toEqualTypeOf<{ count: number; name: string }>();
});

test("infers plugin extensions by id", () => {
  const barPlugin = createPlugin({
    id: "bar",
    extend: () => ({ doBar: (n: number) => n * 2 }),
  });

  const fooPlugin = createPlugin({
    id: "foo",
    extend: () => ({ doFoo: () => "foo" }),
  });

  const { extensions } = createStore({
    state: { count: 0 },
    plugins: plugins([fooPlugin, barPlugin]),
  });

  assertType<{
    foo: { doFoo: () => string };
    bar: { doBar: (n: number) => number };
  }>(extensions);
});

test("createPlugin preserves literal id type", () => {
  const plugin = createPlugin({ id: "myPlugin", extend: () => ({}) });
  expectTypeOf(plugin).toBeFunction();
});
