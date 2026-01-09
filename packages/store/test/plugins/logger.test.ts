import { describe, expect, it, vi } from "vitest";
import { createStore } from "../../src/core/store";
import { plugins } from "../../src/core/types";
import { logger } from "../../src/plugins/logger";

describe("logger plugin", () => {
  it("logs state changes", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { store } = createStore({
      state: { count: 0 },
      actions: {},
      plugins: plugins([logger({ name: "TestStore" })]),
    });

    store.setState({ count: 5 });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const formatString = consoleSpy.mock.calls[0]?.[0] as string;
    expect(formatString).toContain("TestStore");
    expect(formatString).toContain("setState");

    consoleSpy.mockRestore();
  });

  it("does not log when disabled", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { store } = createStore({
      state: { count: 0 },
      actions: {},
      plugins: plugins([logger({ name: "TestStore", enabled: false })]),
    });

    store.setState({ count: 5 });

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("does not log when no changes", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { store } = createStore({
      state: { count: 0 },
      actions: {},
      plugins: plugins([logger({ name: "TestStore" })]),
    });

    store.setState({ count: 0 });

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
