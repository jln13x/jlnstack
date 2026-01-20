import { describe, expect, it } from "vitest";
import { createFlags } from "../src/index";
import { createMemoryAdapter } from "../src/adapters/memory";

describe("createFlags", () => {
  it("returns default value when flag not in storage", async () => {
    const flags = createFlags({
      flags: {
        darkMode: { defaultValue: false },
      },
      adapter: createMemoryAdapter(),
    });

    expect(await flags.get("darkMode")).toBe(false);
  });

  it("returns stored value when flag exists", async () => {
    const flags = createFlags({
      flags: {
        darkMode: { defaultValue: false },
      },
      adapter: createMemoryAdapter({
        initialValues: { "flags:darkMode": "true" },
      }),
    });

    expect(await flags.get("darkMode")).toBe(true);
  });

  it("isEnabled returns boolean for boolean flags", async () => {
    const flags = createFlags({
      flags: {
        newFeature: { defaultValue: true },
      },
      adapter: createMemoryAdapter(),
    });

    expect(await flags.isEnabled("newFeature")).toBe(true);
  });

  it("isEnabled throws for non-boolean flags", async () => {
    const flags = createFlags({
      flags: {
        limit: { defaultValue: 10 },
      },
      adapter: createMemoryAdapter(),
    });

    // @ts-expect-error - Testing runtime error for non-boolean flag
    await expect(flags.isEnabled("limit")).rejects.toThrow(
      "isEnabled can only be used with boolean flags",
    );
  });

  it("set stores and retrieves value", async () => {
    const flags = createFlags({
      flags: {
        limit: { defaultValue: 10 },
      },
      adapter: createMemoryAdapter(),
    });

    await flags.set("limit", 50);
    expect(await flags.get("limit")).toBe(50);
  });

  it("getAll returns all flag values", async () => {
    const flags = createFlags({
      flags: {
        darkMode: { defaultValue: false },
        limit: { defaultValue: 10 },
      },
      adapter: createMemoryAdapter({
        initialValues: { "flags:darkMode": "true" },
      }),
    });

    const all = await flags.getAll();
    expect(all).toEqual({ darkMode: true, limit: 10 });
  });

  it("uses custom prefix", async () => {
    const adapter = createMemoryAdapter({
      initialValues: { "myapp:darkMode": "true" },
    });

    const flags = createFlags({
      flags: {
        darkMode: { defaultValue: false },
      },
      adapter,
      prefix: "myapp:",
    });

    expect(await flags.get("darkMode")).toBe(true);
  });

  it("handles user-specific flags", async () => {
    const adapter = createMemoryAdapter({
      initialValues: {
        "flags:user:user123:betaFeature": "true",
      },
    });

    const flags = createFlags({
      flags: {
        betaFeature: { defaultValue: false },
      },
      adapter,
    });

    expect(
      await flags.get("betaFeature", { context: { userId: "user123" } }),
    ).toBe(true);
    expect(await flags.get("betaFeature")).toBe(false);
  });

  it("handles environment-specific flags", async () => {
    const adapter = createMemoryAdapter({
      initialValues: {
        "flags:env:staging:debugMode": "true",
      },
    });

    const flags = createFlags({
      flags: {
        debugMode: { defaultValue: false },
      },
      adapter,
    });

    expect(
      await flags.get("debugMode", { context: { environment: "staging" } }),
    ).toBe(true);
    expect(await flags.get("debugMode")).toBe(false);
  });

  it("caches values and respects skipCache", async () => {
    let fetchCount = 0;
    const adapter = createMemoryAdapter();
    const originalGet = adapter.get;
    adapter.get = async (...args) => {
      fetchCount++;
      return originalGet.call(adapter, ...args);
    };

    const flags = createFlags({
      flags: { test: { defaultValue: "default" } },
      adapter,
    });

    await flags.get("test");
    await flags.get("test");
    expect(fetchCount).toBe(1);

    await flags.get("test", { skipCache: true });
    expect(fetchCount).toBe(2);
  });

  it("clearCache invalidates cached values", async () => {
    let fetchCount = 0;
    const adapter = createMemoryAdapter();
    const originalGet = adapter.get;
    adapter.get = async (...args) => {
      fetchCount++;
      return originalGet.call(adapter, ...args);
    };

    const flags = createFlags({
      flags: { test: { defaultValue: "default" } },
      adapter,
    });

    await flags.get("test");
    expect(fetchCount).toBe(1);

    flags.clearCache();

    await flags.get("test");
    expect(fetchCount).toBe(2);
  });

  it("delete removes flag value", async () => {
    const flags = createFlags({
      flags: {
        feature: { defaultValue: false },
      },
      adapter: createMemoryAdapter(),
    });

    await flags.set("feature", true);
    expect(await flags.get("feature")).toBe(true);

    await flags.delete("feature");
    expect(await flags.get("feature")).toBe(false);
  });

  it("getWithDetails returns source metadata", async () => {
    const flags = createFlags({
      flags: {
        feature: { defaultValue: false },
      },
      adapter: createMemoryAdapter({
        initialValues: { "flags:feature": "true" },
      }),
    });

    const result = await flags.getWithDetails("feature");
    expect(result.value).toBe(true);
    expect(result.source).toBe("adapter");
    expect(typeof result.fetchedAt).toBe("number");

    // Second call should be from cache
    const cached = await flags.getWithDetails("feature");
    expect(cached.source).toBe("cache");
  });

  it("exposes config for introspection", () => {
    const flagConfig = {
      darkMode: { defaultValue: false, description: "Enable dark mode" },
      limit: { defaultValue: 100 },
    };

    const flags = createFlags({
      flags: flagConfig,
      adapter: createMemoryAdapter(),
    });

    expect(flags.config).toEqual(flagConfig);
  });

  it("handles complex object values", async () => {
    const flags = createFlags({
      flags: {
        config: {
          defaultValue: { theme: "light", maxItems: 10 },
        },
      },
      adapter: createMemoryAdapter(),
    });

    await flags.set("config", { theme: "dark", maxItems: 20 });
    const value = await flags.get("config");
    expect(value).toEqual({ theme: "dark", maxItems: 20 });
  });

  it("throws for unknown flag names", async () => {
    const flags = createFlags({
      flags: {
        known: { defaultValue: true },
      },
      adapter: createMemoryAdapter(),
    });

    // @ts-expect-error - Testing runtime error for unknown flag
    await expect(flags.get("unknown")).rejects.toThrow("Unknown flag: unknown");
  });

  it("works with caching disabled", async () => {
    let fetchCount = 0;
    const adapter = createMemoryAdapter();
    const originalGet = adapter.get;
    adapter.get = async (...args) => {
      fetchCount++;
      return originalGet.call(adapter, ...args);
    };

    const flags = createFlags({
      flags: { test: { defaultValue: "default" } },
      adapter,
      cache: { enabled: false },
    });

    await flags.get("test");
    await flags.get("test");
    expect(fetchCount).toBe(2);
  });
});

describe("memory adapter", () => {
  it("supports getMany for batch operations", async () => {
    const adapter = createMemoryAdapter({
      initialValues: {
        "key1": "value1",
        "key2": "value2",
      },
    });

    const result = await adapter.getMany!(["key1", "key2", "key3"]);
    expect(result.get("key1")).toBe("value1");
    expect(result.get("key2")).toBe("value2");
    expect(result.get("key3")).toBeUndefined();
  });
});
