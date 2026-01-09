import { describe, expect, it } from "vitest";
import { createStore } from "../../src/index";
import { history } from "../../src/plugins/history";

describe("history plugin", () => {
  it("undoes state changes", () => {
    const { getState, setState, extensions } = createStore({
      state: { count: 0 },
      plugins: [history()],
    });

    setState({ count: 1 });
    setState({ count: 2 });

    extensions.history.undo();
    expect(getState().count).toBe(1);

    extensions.history.undo();
    expect(getState().count).toBe(0);
  });

  it("redoes undone changes", () => {
    const { getState, setState, extensions } = createStore({
      state: { count: 0 },
      plugins: [history()],
    });

    setState({ count: 1 });
    extensions.history.undo();
    expect(getState().count).toBe(0);

    extensions.history.redo();
    expect(getState().count).toBe(1);
  });

  it("clears future on new change after undo", () => {
    const { getState, setState, extensions } = createStore({
      state: { count: 0 },
      plugins: [history()],
    });

    setState({ count: 1 });
    setState({ count: 2 });
    extensions.history.undo();

    setState({ count: 99 });
    expect(extensions.history.canRedo()).toBe(false);
  });

  it("respects limit option", () => {
    const { setState, extensions } = createStore({
      state: { count: 0 },
      plugins: [history({ limit: 2 })],
    });

    setState({ count: 1 });
    setState({ count: 2 });
    setState({ count: 3 });

    expect(extensions.history.pastStates()).toHaveLength(2);
  });

  it("canUndo and canRedo return correct values", () => {
    const { setState, extensions } = createStore({
      state: { count: 0 },
      plugins: [history()],
    });

    expect(extensions.history.canUndo()).toBe(false);
    expect(extensions.history.canRedo()).toBe(false);

    setState({ count: 1 });
    expect(extensions.history.canUndo()).toBe(true);

    extensions.history.undo();
    expect(extensions.history.canRedo()).toBe(true);
  });

  it("clear removes all history", () => {
    const { setState, extensions } = createStore({
      state: { count: 0 },
      plugins: [history()],
    });

    setState({ count: 1 });
    setState({ count: 2 });
    extensions.history.undo();

    extensions.history.clear();
    expect(extensions.history.canUndo()).toBe(false);
    expect(extensions.history.canRedo()).toBe(false);
  });
});
