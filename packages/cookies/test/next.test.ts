import type { StandardSchemaV1 } from "@standard-schema/spec";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createCookie } from "../src/next";

function createMockSchema<T>(
  transform: (value: unknown) => T,
): StandardSchemaV1<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value) => ({ value: transform(value) as T }),
    },
  };
}

function createFailingSchema(message: string): StandardSchemaV1<never> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => ({ issues: [{ message }] }),
    },
  };
}

const mockCookieStore = {
  store: new Map<string, string>(),
  get: vi.fn((name: string) => {
    const value = mockCookieStore.store.get(name);
    return value ? { value } : undefined;
  }),
  set: vi.fn((name: string, value: string, _options?: unknown) => {
    mockCookieStore.store.set(name, value);
  }),
  delete: vi.fn((name: string) => {
    mockCookieStore.store.delete(name);
  }),
};

vi.mock("next/headers", () => ({
  cookies: vi.fn(() => Promise.resolve(mockCookieStore)),
}));

describe("next createCookie", () => {
  beforeEach(() => {
    mockCookieStore.store.clear();
    vi.clearAllMocks();
  });

  it("gets and sets string values", async () => {
    const cookie = createCookie<string>({ name: "theme" });

    expect(await cookie.get()).toBe(undefined);

    await cookie.set("dark");
    expect(mockCookieStore.set).toHaveBeenCalledWith(
      "theme",
      "dark",
      undefined,
    );
    expect(await cookie.get()).toBe("dark");
  });

  it("gets and sets object values", async () => {
    const cookie = createCookie<{ sort: string }>({ name: "filter" });

    await cookie.set({ sort: "name" });
    expect(await cookie.get()).toEqual({ sort: "name" });
  });

  it("deletes cookies", async () => {
    const cookie = createCookie<string>({ name: "session" });

    await cookie.set("abc123");
    expect(await cookie.get()).toBe("abc123");

    await cookie.delete();
    expect(mockCookieStore.delete).toHaveBeenCalledWith("session");
    expect(await cookie.get()).toBe(undefined);
  });

  it("passes options to set", async () => {
    const cookie = createCookie<string>({ name: "session" });

    await cookie.set("value", { maxAge: 3600, secure: true });
    expect(mockCookieStore.set).toHaveBeenCalledWith("session", "value", {
      maxAge: 3600,
      secure: true,
    });
  });

  it("validates values with schema on get", async () => {
    const schema = createMockSchema((v) => v as { sort: string });
    const cookie = createCookie({ name: "filter", schema });

    mockCookieStore.store.set("filter", JSON.stringify({ sort: "name" }));
    expect(await cookie.get()).toEqual({ sort: "name" });
  });

  it("returns undefined when schema validation fails on get", async () => {
    const schema = createFailingSchema("Invalid value");
    const cookie = createCookie({ name: "test", schema });

    mockCookieStore.store.set("test", JSON.stringify({ invalid: true }));
    expect(await cookie.get()).toBe(undefined);
  });

  it("throws when schema validation fails on set", async () => {
    const schema = createFailingSchema("Invalid value");
    const cookie = createCookie({ name: "test", schema });

    await expect(cookie.set("bad" as never)).rejects.toThrow(
      "Invalid cookie value",
    );
  });

  it("exposes name property", () => {
    const cookie = createCookie<string>({ name: "myName" });
    expect(cookie.name).toBe("myName");
  });

  it("handles undefined cookie value", async () => {
    const cookie = createCookie<string>({ name: "nonexistent" });
    expect(await cookie.get()).toBe(undefined);
  });
});
