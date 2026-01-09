import { describe, expect, it } from "vitest";
import { createStore } from "../../src/index";
import { immer } from "../../src/plugins/immer";

describe("immer plugin", () => {
  it("allows mutative updates in setState", () => {
    const { getState, setState } = createStore({
      state: { count: 0 },
      plugins: [immer()],
    });

    setState((s) => {
      s.count = 5;
    });

    expect(getState().count).toBe(5);
  });

  it("allows mutative updates in actions", () => {
    const { getState, actions } = createStore({
      state: { items: [] as string[] },
      actions: (set) => ({
        addItem: (item: string) =>
          set((s) => {
            s.items.push(item);
          }),
      }),
      plugins: [immer()],
    });

    actions.addItem("first");
    actions.addItem("second");

    expect(getState().items).toEqual(["first", "second"]);
  });

  it("allows nested object mutations", () => {
    const { getState, setState } = createStore({
      state: { user: { name: "Alice", age: 30 } },
      plugins: [immer()],
    });

    setState((s) => {
      s.user.name = "Bob";
    });

    expect(getState().user).toEqual({ name: "Bob", age: 30 });
  });
});
