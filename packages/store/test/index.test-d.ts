import { assertType, expectTypeOf, test } from "vitest";
import { createPlugin, createStore, type Plugin } from "../src/index";

test("infers state and actions types", () => {
  const { getState, actions } = createStore({
    state: { count: 0, name: "test" },
    actions: (set, get) => ({
      increment: () => set({ count: get().count + 1 }),
      add: (n: number) => set((s) => ({ count: s.count + n })),
      getCount: () => get().count,
    }),
  });

  expectTypeOf(getState()).toEqualTypeOf<{ count: number; name: string }>();
  expectTypeOf(actions.add).toEqualTypeOf<(n: number) => void>();
  expectTypeOf(actions.getCount).toEqualTypeOf<() => number>();
});

test("infers plugin extensions by id", () => {
  const barPlugin = createPlugin({
    id: "bar",
    extend: () => ({ doBar: (n: number) => n * 2 }),
  });

  const { extensions } = createStore({
    state: { count: 0 },
    plugins: [{ id: "foo", extend: () => ({ doFoo: () => "foo" }) }, barPlugin],
  });

  assertType<{
    foo: { doFoo: () => string };
    bar: { doBar: (n: number) => number };
  }>(extensions);
});

test("rejects plugin with incompatible state constraint", () => {
  const countPlugin = {
    id: "counter",
    extend: (store) => ({
      increment: () => store.setState((s) => ({ count: s.count + 1 })),
    }),
  } satisfies Plugin<{ count: number }>;

  createStore({
    state: { name: "test" },
    // @ts-expect-error - countPlugin requires { count: number }
    plugins: [countPlugin],
  });
});

test("createPlugin preserves literal id type", () => {
  const plugin = createPlugin({ id: "myPlugin", extend: () => ({}) });
  expectTypeOf(plugin.id).toEqualTypeOf<"myPlugin">();
});
