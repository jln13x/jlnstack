import { describe, expect, it, vi } from "vitest";
import { createPlugin, createStore } from "../src/index";

describe("createStore", () => {
  it("creates store with initial state", () => {
    const { getState } = createStore({ state: { count: 0 } });
    expect(getState()).toEqual({ count: 0 });
  });

  it("updates state with setState", () => {
    const { getState, setState } = createStore({ state: { count: 0 } });

    setState({ count: 5 });
    expect(getState().count).toBe(5);
  });

  it("supports partial updates", () => {
    const { getState, setState } = createStore({
      state: { count: 0, name: "test" },
    });

    setState({ count: 5 });
    expect(getState()).toEqual({ count: 5, name: "test" });
  });

  it("supports updater function", () => {
    const { getState, setState } = createStore({ state: { count: 0 } });

    setState((s) => ({ count: s.count + 1 }));
    expect(getState().count).toBe(1);
  });

  it("notifies subscribers on state change", () => {
    const { setState, subscribe } = createStore({ state: { count: 0 } });
    const listener = vi.fn();

    subscribe(listener);
    setState({ count: 1 });

    expect(listener).toHaveBeenCalledTimes(1);
  });
});

describe("actions", () => {
  it("creates actions with set and get", () => {
    const { actions, getState } = createStore({
      state: { count: 0 },
      actions: (set, get) => ({
        increment: () => set({ count: get().count + 1 }),
        decrement: () => set((s) => ({ count: s.count - 1 })),
      }),
    });

    actions.increment();
    expect(getState().count).toBe(1);

    actions.decrement();
    expect(getState().count).toBe(0);
  });

  it("returns empty object when no actions provided", () => {
    const { actions } = createStore({ state: { count: 0 } });
    expect(actions).toEqual({});
  });
});

describe("plugins", () => {
  it("calls onStateChange for each plugin on state change", () => {
    const onStateChange = vi.fn();
    const { setState } = createStore({
      state: { count: 0 },
      plugins: [{ id: "test", onStateChange }],
    });

    expect(onStateChange).not.toHaveBeenCalled();
    setState({ count: 1 });
    expect(onStateChange).toHaveBeenCalledTimes(1);
    expect(onStateChange).toHaveBeenCalledWith({ count: 1 }, { count: 0 });
  });

  it("calls onActionsCreated for each plugin", () => {
    const onActionsCreated = vi.fn((actions) => actions);
    createStore({
      state: { count: 0 },
      actions: () => ({ test: () => {} }),
      plugins: [{ id: "test", onActionsCreated }],
    });

    expect(onActionsCreated).toHaveBeenCalledTimes(1);
  });

  it("allows plugin to wrap actions", () => {
    const logged: string[] = [];

    const { actions } = createStore({
      state: { count: 0 },
      actions: () => ({
        increment: () => {},
      }),
      plugins: [
        {
          id: "logger",
          onActionsCreated: (actions) => {
            const wrapped = {} as typeof actions;
            for (const key in actions) {
              const original = actions[key as keyof typeof actions];
              if (typeof original === "function") {
                // @ts-expect-error
                wrapped[key as keyof typeof actions] = (...args: unknown[]) => {
                  logged.push(key);
                  return (original as Function)(...args);
                };
              }
            }
            return wrapped;
          },
        },
      ],
    });

    actions.increment();
    expect(logged).toEqual(["increment"]);
  });

  it("applies middleware in order", () => {
    const order: number[] = [];

    createStore({
      state: { count: 0 },
      plugins: [
        {
          id: "first",
          middleware: (creator) => () => {
            order.push(1);
            return creator();
          },
        },
        {
          id: "second",
          middleware: (creator) => () => {
            order.push(2);
            return creator();
          },
        },
      ],
    });

    expect(order).toEqual([2, 1]);
  });

  it("adds extensions from plugins", () => {
    const { extensions } = createStore({
      state: { count: 0 },
      plugins: [
        {
          id: "foo",
          extend: () => ({ doFoo: () => "foo" }),
        },
        {
          id: "bar",
          extend: () => ({ doBar: () => "bar" }),
        },
      ],
    });

    expect(extensions.foo.doFoo()).toBe("foo");
    expect(extensions.bar.doBar()).toBe("bar");
  });

  it("passes store and initialState to extend", () => {
    const { extensions, getState, setState } = createStore({
      state: { count: 5 },
      plugins: [
        {
          id: "test",
          extend: (store, initialState) => ({
            getInitial: () => initialState,
            double: () => store.setState((s) => ({ count: s.count * 2 })),
          }),
        },
      ],
    });

    expect(extensions.test.getInitial()).toEqual({ count: 5 });

    setState({ count: 3 });
    extensions.test.double();
    expect(getState().count).toBe(6);
  });
});

describe("createPlugin", () => {
  it("returns the plugin as-is", () => {
    const plugin = createPlugin({
      id: "test",
      extend: () => ({ test: true }),
    });

    expect(plugin.id).toBe("test");
    expect(plugin.extend?.()).toEqual({ test: true });
  });
});
