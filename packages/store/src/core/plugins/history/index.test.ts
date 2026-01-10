import { describe, expect, it } from "vitest";
import { createStore } from "../../core";
import { plugins } from "../../types";
import { history } from "./index";

describe("history plugin", () => {
  it("undoes state changes", () => {
    const { store, extension } = createStore({
      state: { count: 0 },
      actions: {},
      plugins: plugins([history()]),
    });

    store.setState({ count: 1 });
    store.setState({ count: 2 });

    extension.history.undo();
    expect(store.getState().count).toBe(1);

    extension.history.undo();
    expect(store.getState().count).toBe(0);
  });

  it("redoes undone changes", () => {
    const { store, extension } = createStore({
      state: { count: 0 },
      actions: {},
      plugins: plugins([history()]),
    });

    store.setState({ count: 1 });
    extension.history.undo();
    expect(store.getState().count).toBe(0);

    extension.history.redo();
    expect(store.getState().count).toBe(1);
  });

  it("clears future on new change after undo", () => {
    const { store, extension } = createStore({
      state: { count: 0 },
      actions: {},
      plugins: plugins([history()]),
    });

    store.setState({ count: 1 });
    store.setState({ count: 2 });
    extension.history.undo();

    store.setState({ count: 99 });
    expect(extension.history.canRedo()).toBe(false);
  });

  it("respects limit option", () => {
    const { store, extension } = createStore({
      state: { count: 0 },
      actions: {},
      plugins: plugins([history({ limit: 2 })]),
    });

    store.setState({ count: 1 });
    store.setState({ count: 2 });
    store.setState({ count: 3 });

    expect(extension.history.pastStates()).toHaveLength(2);
  });

  it("canUndo and canRedo return correct values", () => {
    const { store, extension } = createStore({
      state: { count: 0 },
      actions: {},
      plugins: plugins([history()]),
    });

    expect(extension.history.canUndo()).toBe(false);
    expect(extension.history.canRedo()).toBe(false);

    store.setState({ count: 1 });
    expect(extension.history.canUndo()).toBe(true);

    extension.history.undo();
    expect(extension.history.canRedo()).toBe(true);
  });

  it("clear removes all history", () => {
    const { store, extension } = createStore({
      state: { count: 0 },
      actions: {},
      plugins: plugins([history()]),
    });

    store.setState({ count: 1 });
    store.setState({ count: 2 });
    extension.history.undo();

    extension.history.clear();
    expect(extension.history.canUndo()).toBe(false);
    expect(extension.history.canRedo()).toBe(false);
  });
});
