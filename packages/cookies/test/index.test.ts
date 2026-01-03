import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { createCookie } from "../src/index";

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

function createAsyncSchema(): StandardSchemaV1<string> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => Promise.resolve({ value: "async" }),
    },
  };
}

describe("createCookie", () => {
  it("gets and sets string values without schema", async () => {
    let store: string | undefined;

    const cookie = createCookie<string>({
      name: "theme",
      get: () => store,
      set: (value) => {
        store = value;
      },
      delete: () => {
        store = undefined;
      },
    });

    expect(cookie.name).toBe("theme");
    expect(await cookie.get()).toBe(undefined);

    await cookie.set("dark");
    expect(await cookie.get()).toBe("dark");

    await cookie.delete();
    expect(await cookie.get()).toBe(undefined);
  });

  it("gets and sets object values without schema", async () => {
    let store: string | undefined;

    const cookie = createCookie<{ sort: string; order: string }>({
      name: "filter",
      get: () => store,
      set: (value) => {
        store = value;
      },
      delete: () => {
        store = undefined;
      },
    });

    await cookie.set({ sort: "name", order: "asc" });
    expect(await cookie.get()).toEqual({ sort: "name", order: "asc" });
  });

  it("validates values with schema on get", async () => {
    let store: string | undefined = JSON.stringify({ sort: "name" });

    const schema = createMockSchema((v) => v as { sort: string });
    const cookie = createCookie({
      name: "filter",
      schema,
      get: () => store,
      set: (value) => {
        store = value;
      },
      delete: () => {
        store = undefined;
      },
    });

    expect(await cookie.get()).toEqual({ sort: "name" });
  });

  it("returns undefined when schema validation fails on get", async () => {
    const store = JSON.stringify({ invalid: true });

    const schema = createFailingSchema("Invalid value");
    const cookie = createCookie({
      name: "test",
      schema,
      get: () => store,
      set: () => {},
      delete: () => {},
    });

    expect(await cookie.get()).toBe(undefined);
  });

  it("throws when schema validation fails on set", async () => {
    const schema = createFailingSchema("Invalid value");
    const cookie = createCookie({
      name: "test",
      schema,
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    await expect(cookie.set("bad" as never)).rejects.toThrow(
      "Invalid cookie value",
    );
  });

  it("supports async schema validation", async () => {
    const schema = createAsyncSchema();
    const cookie = createCookie({
      name: "test",
      schema,
      get: () => "value",
      set: () => {},
      delete: () => {},
    });

    expect(await cookie.get()).toBe("async");
  });

  it("passes options to set function", async () => {
    let receivedOptions: unknown;

    const cookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: (_value, options) => {
        receivedOptions = options;
      },
      delete: () => {},
    });

    await cookie.set("abc123", { maxAge: 3600, secure: true });
    expect(receivedOptions).toEqual({ maxAge: 3600, secure: true });
  });

  it("serializes and deserializes complex objects", async () => {
    let store: string | undefined;

    const cookie = createCookie<{ nested: { deep: boolean[] } }>({
      name: "complex",
      get: () => store,
      set: (value) => {
        store = value;
      },
      delete: () => {
        store = undefined;
      },
    });

    await cookie.set({ nested: { deep: [true, false, true] } });
    expect(await cookie.get()).toEqual({
      nested: { deep: [true, false, true] },
    });
  });
});
