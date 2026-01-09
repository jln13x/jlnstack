import { describe, expect, it } from "vitest";
import { createStore, plugins } from "../../src/index";
import { reset } from "../../src/plugins/reset";

describe("reset plugin", () => {
  it("resets state to initial value", () => {
    const { getState, setState, extensions } = createStore({
      state: { count: 0, name: "initial" },
      plugins: plugins([reset()]),
    });

    setState({ count: 10, name: "modified" });
    expect(getState()).toEqual({ count: 10, name: "modified" });

    extensions.reset.reset();
    expect(getState()).toEqual({ count: 0, name: "initial" });
  });

  it("works after multiple state changes", () => {
    const { getState, setState, extensions } = createStore({
      state: { value: 1 },
      plugins: plugins([reset()]),
    });

    setState({ value: 2 });
    setState({ value: 3 });
    setState({ value: 4 });

    extensions.reset.reset();
    expect(getState().value).toBe(1);
  });

  it("returns the initial state", () => {
    const { setState, extensions } = createStore({
      state: { count: 0, name: "initial" },
      plugins: plugins([reset()]),
    });

    setState({ count: 10, name: "modified" });
    const result = extensions.reset.reset();

    expect(result).toEqual({ count: 0, name: "initial" });
  });
});
