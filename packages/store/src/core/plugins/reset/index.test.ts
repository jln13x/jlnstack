import { describe, expect, it } from "vitest";
import { reset } from "./index";
import { createStore } from "../../store";
import { plugins } from "../../types";

describe("reset plugin", () => {
  it("resets state to initial value", () => {
    const { store, extension } = createStore({
      state: { count: 0, name: "initial" },
      actions: {},
      plugins: plugins([reset()]),
    });

    store.setState({ count: 10, name: "modified" });
    expect(store.getState()).toEqual({ count: 10, name: "modified" });

    extension.reset.reset();
    expect(store.getState()).toEqual({ count: 0, name: "initial" });
  });

  it("works after multiple state changes", () => {
    const { store, extension } = createStore({
      state: { value: 1 },
      actions: {},
      plugins: plugins([reset()]),
    });

    store.setState({ value: 2 });
    store.setState({ value: 3 });
    store.setState({ value: 4 });

    extension.reset.reset();
    expect(store.getState().value).toBe(1);
  });

  it("returns the initial state", () => {
    const { store, extension } = createStore({
      state: { count: 0, name: "initial" },
      actions: {},
      plugins: plugins([reset()]),
    });

    store.setState({ count: 10, name: "modified" });
    const result = extension.reset.reset();

    expect(result).toEqual({ count: 0, name: "initial" });
  });
});
