import { describe, expect, it } from "vitest";
import { createStore } from "../../core";
import { history } from "./index";

describe("history plugin", () => {
  it("undoes state changes", () => {
    const { store, plugins } = createStore({
      state: { count: 0 },
      actions: () => ({}),
      plugins: [history()],
    });

    store.setState({ count: 1 });
    store.setState({ count: 2 });

    plugins.history.undo();
    expect(store.getState().count).toBe(1);

    plugins.history.undo();
    expect(store.getState().count).toBe(0);
  });

  it("redoes undone changes", () => {
    const { store, plugins } = createStore({
      state: { count: 0 },
      actions: () => ({}),
      plugins: [history()],
    });

    store.setState({ count: 1 });
    plugins.history.undo();
    expect(store.getState().count).toBe(0);

    plugins.history.redo();
    expect(store.getState().count).toBe(1);
  });

  it("clears future on new change after undo", () => {
    const { store, plugins } = createStore({
      state: { count: 0 },
      actions: () => ({}),
      plugins: [history()],
    });

    store.setState({ count: 1 });
    store.setState({ count: 2 });
    plugins.history.undo();

    store.setState({ count: 99 });
    expect(plugins.history.canRedo()).toBe(false);
  });

  it("respects limit option", () => {
    const { store, plugins } = createStore({
      state: { count: 0 },
      actions: () => ({}),
      plugins: [history({ limit: 2 })],
    });

    store.setState({ count: 1 });
    store.setState({ count: 2 });
    store.setState({ count: 3 });

    expect(plugins.history.pastStates()).toHaveLength(2);
  });

  it("canUndo and canRedo return correct values", () => {
    const { store, plugins } = createStore({
      state: { count: 0 },
      actions: () => ({}),
      plugins: [history()],
    });

    expect(plugins.history.canUndo()).toBe(false);
    expect(plugins.history.canRedo()).toBe(false);

    store.setState({ count: 1 });
    expect(plugins.history.canUndo()).toBe(true);

    plugins.history.undo();
    expect(plugins.history.canRedo()).toBe(true);
  });

  it("clear removes all history", () => {
    const { store, plugins } = createStore({
      state: { count: 0 },
      actions: () => ({}),
      plugins: [history()],
    });

    store.setState({ count: 1 });
    store.setState({ count: 2 });
    plugins.history.undo();

    plugins.history.clear();
    expect(plugins.history.canUndo()).toBe(false);
    expect(plugins.history.canRedo()).toBe(false);
  });
});
