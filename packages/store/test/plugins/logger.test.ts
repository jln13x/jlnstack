import { describe, expect, it, vi } from "vitest";
import { createStore } from "../../src/index";
import { logger } from "../../src/plugins/logger";

describe("logger plugin", () => {
  it("logs state changes with action name", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { actions } = createStore({
      state: { count: 0 },
      actions: (set) => ({
        increment: () => set((s) => ({ count: s.count + 1 })),
      }),
      plugins: [logger({ name: "TestStore" })],
    });

    actions.increment();

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0]![0]).toContain("TestStore");
    expect(consoleSpy.mock.calls[0]![0]).toContain("increment");

    consoleSpy.mockRestore();
  });

  it("logs setState when no action name", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { setState } = createStore({
      state: { count: 0 },
      plugins: [logger({ name: "TestStore" })],
    });

    setState({ count: 5 });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    expect(consoleSpy.mock.calls[0]![0]).toContain("setState");

    consoleSpy.mockRestore();
  });

  it("does not log when disabled", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { setState } = createStore({
      state: { count: 0 },
      plugins: [logger({ name: "TestStore", enabled: false })],
    });

    setState({ count: 5 });

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("does not log when no changes", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { setState } = createStore({
      state: { count: 0 },
      plugins: [logger({ name: "TestStore" })],
    });

    setState({ count: 0 });

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
