import { describe, expect, it, vi } from "vitest";
import { createStore, plugins } from "../../src/index";
import { logger } from "../../src/plugins/logger";

describe("logger plugin", () => {
  it("logs state changes", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { setState } = createStore({
      state: { count: 0 },
      plugins: plugins([logger({ name: "TestStore" })]),
    });

    setState({ count: 5 });

    expect(consoleSpy).toHaveBeenCalledTimes(1);
    const formatString = consoleSpy.mock.calls[0]?.[0] as string;
    expect(formatString).toContain("TestStore");
    expect(formatString).toContain("setState");

    consoleSpy.mockRestore();
  });

  it("does not log when disabled", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { setState } = createStore({
      state: { count: 0 },
      plugins: plugins([logger({ name: "TestStore", enabled: false })]),
    });

    setState({ count: 5 });

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("does not log when no changes", () => {
    const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

    const { setState } = createStore({
      state: { count: 0 },
      plugins: plugins([logger({ name: "TestStore" })]),
    });

    setState({ count: 0 });

    expect(consoleSpy).not.toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});
