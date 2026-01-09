import { describe, expect, it } from "vitest";
import { createStore, plugins } from "../../src/index";
import { immer } from "../../src/plugins/immer";

describe("immer plugin", () => {
  it("allows mutative updates in setState", () => {
    const { getState, setState } = createStore({
      state: { count: 0 },
      plugins: plugins([immer()]),
    });

    setState((s) => {
      s.count = 5;
    });

    expect(getState().count).toBe(5);
  });

  it("allows nested object mutations", () => {
    const { getState, setState } = createStore({
      state: { user: { name: "Alice", age: 30 } },
      plugins: plugins([immer()]),
    });

    setState((s) => {
      s.user.name = "Bob";
    });

    expect(getState().user).toEqual({ name: "Bob", age: 30 });
  });

  it("allows array mutations", () => {
    const { getState, setState } = createStore({
      state: { items: [] as string[] },
      plugins: plugins([immer()]),
    });

    setState((s) => {
      s.items.push("first");
    });
    setState((s) => {
      s.items.push("second");
    });

    expect(getState().items).toEqual(["first", "second"]);
  });
});
