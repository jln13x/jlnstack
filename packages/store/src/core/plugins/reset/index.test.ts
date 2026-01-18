import { describe, expect, it } from "vitest";
import { createStore } from "../../core";
import { reset } from "./index";

describe("reset plugin", () => {
  it("resets state to initial value", () => {
    const { store, plugins } = createStore({
      state: { count: 0, name: "initial" },
      actions: () => ({}),
      plugins: [reset()],
    });

    store.setState({ count: 10, name: "modified" });
    expect(store.getState()).toEqual({ count: 10, name: "modified" });

    plugins.reset.reset();
    expect(store.getState()).toEqual({ count: 0, name: "initial" });
  });

  it("works after multiple state changes", () => {
    const { store, plugins } = createStore({
      state: { value: 1 },
      actions: () => ({}),
      plugins: [reset()],
    });

    store.setState({ value: 2 });
    store.setState({ value: 3 });
    store.setState({ value: 4 });

    plugins.reset.reset();
    expect(store.getState().value).toBe(1);
  });

  it("returns the initial state", () => {
    const { store, plugins } = createStore({
      state: { count: 0, name: "initial" },
      actions: () => ({}),
      plugins: [reset()],
    });

    store.setState({ count: 10, name: "modified" });
    const result = plugins.reset.reset();

    expect(result).toEqual({ count: 0, name: "initial" });
  });
});
