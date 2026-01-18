import { describe, expect, it } from "vitest";
import { createStore } from "../../core";
import { immer } from "./index";

describe("immer plugin", () => {
  it("allows mutative updates in setState", () => {
    const { store } = createStore({
      state: { count: 0 },
      actions: () => ({}),
      plugins: [immer()],
    });

    store.setState((s) => {
      s.count = 5;
      return s;
    });

    expect(store.getState().count).toBe(5);
  });

  it("allows nested object mutations", () => {
    const { store } = createStore({
      state: { user: { name: "Alice", age: 30 } },
      actions: () => ({}),
      plugins: [immer()],
    });

    store.setState((s) => {
      s.user.name = "Bob";
      return s;
    });

    expect(store.getState().user).toEqual({ name: "Bob", age: 30 });
  });

  it("allows array mutations", () => {
    const { store } = createStore({
      state: { items: [] as string[] },
      actions: () => ({}),
      plugins: [immer()],
    });

    store.setState((s) => {
      s.items.push("first");
      return s;
    });
    store.setState((s) => {
      s.items.push("second");
      return s;
    });

    expect(store.getState().items).toEqual(["first", "second"]);
  });

  it("works with direct state replacement", () => {
    const { store } = createStore({
      state: { count: 0 },
      actions: () => ({}),
      plugins: [immer()],
    });

    store.setState({ count: 10 });

    expect(store.getState().count).toBe(10);
  });
});
