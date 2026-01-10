import { describe, expect, it, vi } from "vitest";
import { createPlugin, createStore, plugins } from "../src/_deprecated";

describe("createStore", () => {
  it("creates store with initial state", () => {
    const { getState } = createStore({
      state: { count: 0 },
      plugins: plugins([]),
    });
    expect(getState()).toEqual({ count: 0 });
  });

  it("updates state with setState", () => {
    const { getState, setState } = createStore({
      state: { count: 0 },
      plugins: plugins([]),
    });

    setState({ count: 5 });
    expect(getState().count).toBe(5);
  });

  it("supports partial updates", () => {
    const { getState, setState } = createStore({
      state: { count: 0, name: "test" },
      plugins: plugins([]),
    });

    setState({ count: 5 });
    expect(getState()).toEqual({ count: 5, name: "test" });
  });

  it("supports updater function", () => {
    const { getState, setState } = createStore({
      state: { count: 0 },
      plugins: plugins([]),
    });

    setState((s) => ({ count: s.count + 1 }));
    expect(getState().count).toBe(1);
  });

  it("notifies subscribers on state change", () => {
    const { setState, subscribe } = createStore({
      state: { count: 0 },
      plugins: plugins([]),
    });
    const listener = vi.fn();

    subscribe(listener);
    setState({ count: 1 });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("plugins", () => {
  it("calls onStateChange for each plugin on state change", () => {
    const onStateChange = vi.fn();
    const testPlugin = createPlugin({ id: "test", onStateChange });

    const { setState } = createStore({
      state: { count: 0 },
      plugins: plugins([testPlugin]),
    });

    expect(onStateChange).not.toHaveBeenCalled();
    setState({ count: 1 });
    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
  });

  it("applies middleware in order", () => {
    const order: number[] = [];

    const first = createPlugin({
      id: "first",
      middleware: (creator) => () => {
        order.push(1);
        return creator();
      },
    });

    const second = createPlugin({
      id: "second",
      middleware: (creator) => () => {
        order.push(2);
        return creator();
      },
    });

    createStore({
      state: { count: 0 },
      plugins: plugins([first, second]),
    });

    expect(order).toEqual([2, 1]);
  });

  it("adds extensions from plugins", () => {
    const foo = createPlugin({
      id: "foo",
      extend: () => ({ doFoo: () => "foo" }),
    });

    const bar = createPlugin({
      id: "bar",
      extend: () => ({ doBar: () => "bar" }),
    });

    const { extensions } = createStore({
      state: { count: 0 },
      plugins: plugins([foo, bar]),
    });

    expect(extensions.foo.doFoo()).toBe("foo");
    expect(extensions.bar.doBar()).toBe("bar");
  });

  it("passes store and initialState to extend", () => {
    const test = createPlugin({
      id: "test",
      extend: (store, initialState) => ({
        getInitial: () => initialState,
        double: () =>
          store.setState((s) => ({
            count: (s as { count: number }).count * 2,
          })),
      }),
    });

    const { extensions, getState, setState } = createStore({
      state: { count: 5 },
      plugins: plugins([test]),
    });

    expect(extensions.test.getInitial()).toEqual({ count: 5 });

    setState({ count: 3 });
    extensions.test.double();
    expect(getState().count).toBe(6);
  });
});

describe("createPlugin", () => {
  it("returns a factory function", () => {
    const plugin = createPlugin({
      id: "test",
      extend: () => ({ test: true }),
    });

    expect(typeof plugin).toBe("function");
  });
});
