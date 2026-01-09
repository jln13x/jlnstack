import { describe, expect, it } from "vitest";
import { createStore } from "../../src/index";
import { reset } from "../../src/plugins/reset";

describe("reset plugin", () => {
  it("resets state to initial value", () => {
    const { getState, setState, extensions } = createStore({
      state: { count: 0, name: "initial" },
      plugins: [reset()],
    });

    setState({ count: 10, name: "modified" });
    expect(getState()).toEqual({ count: 10, name: "modified" });

    extensions.reset.reset();
    expect(getState()).toEqual({ count: 0, name: "initial" });
  });

  it("works after multiple state changes", () => {
    const { getState, setState, extensions } = createStore({
      state: { value: 1 },
      plugins: [reset()],
    });

    setState({ value: 2 });
    setState({ value: 3 });
    setState({ value: 4 });

    extensions.reset.reset();
    expect(getState().value).toBe(1);
  });
});
