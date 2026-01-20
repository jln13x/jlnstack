import { describe, expect, it } from "vitest";
import { createFlags, memoryAdapter } from "../src";

describe("createFlags", () => {
  it("returns enabled flags", async () => {
    const flags = createFlags({
      flags: ["feature-a", "feature-b"] as const,
      adapter: memoryAdapter({ flags: { "feature-a": true } }),
    });

    expect(await flags.isEnabled("feature-a")).toBe(true);
  });

  it("returns default for missing flags", async () => {
    const flags = createFlags({
      flags: ["feature-a"] as const,
      adapter: memoryAdapter(),
      defaultValue: false,
    });

    expect(await flags.isEnabled("feature-a")).toBe(false);
  });

  it("uses custom default value", async () => {
    const flags = createFlags({
      flags: ["feature-a"] as const,
      adapter: memoryAdapter(),
      defaultValue: true,
    });

    expect(await flags.isEnabled("feature-a")).toBe(true);
  });

  it("returns disabled flags correctly", async () => {
    const flags = createFlags({
      flags: ["feature-a"] as const,
      adapter: memoryAdapter({ flags: { "feature-a": false } }),
    });

    expect(await flags.isEnabled("feature-a")).toBe(false);
  });

  it("getAll returns all flag values", async () => {
    const flags = createFlags({
      flags: ["a", "b", "c"] as const,
      adapter: memoryAdapter({ flags: { a: true, c: true } }),
    });

    const all = await flags.getAll();
    expect(all).toEqual({ a: true, b: false, c: true });
  });
});

describe("memoryAdapter", () => {
  it("returns null for unknown flags", () => {
    const adapter = memoryAdapter();
    expect(adapter.get("unknown")).toBeNull();
  });

  it("returns flag values from config", () => {
    const adapter = memoryAdapter({
      flags: { enabled: true, disabled: false },
    });

    expect(adapter.get("enabled")).toBe(true);
    expect(adapter.get("disabled")).toBe(false);
  });
});
