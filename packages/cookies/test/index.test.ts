import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { createCookie, createCookieGroup } from "../src/index";
import type { Serializer } from "../src/types";

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

  it("defaults to string type when no schema and no generic", async () => {
    let store: string | undefined;

    const cookie = createCookie({
      name: "theme",
      get: () => store,
      set: (value) => {
        store = value;
      },
      delete: () => {
        store = undefined;
      },
    });

    await cookie.set("dark");
    expect(await cookie.get()).toBe("dark");
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

  it("uses custom serializer for date time serialization", async () => {
    let store: string | undefined;

    const dateSerializer: Serializer<Date> = {
      serialize: (value) => value.toISOString(),
      deserialize: (raw) => new Date(raw),
    };

    const cookie = createCookie<Date>({
      name: "lastVisit",
      serializer: dateSerializer,
      get: () => store,
      set: (value) => {
        store = value;
      },
      delete: () => {
        store = undefined;
      },
    });

    const testDate = new Date("2024-01-15T10:30:00Z");
    await cookie.set(testDate);

    const retrieved = await cookie.get();
    expect(retrieved).toBeInstanceOf(Date);
    expect(retrieved?.toISOString()).toBe("2024-01-15T10:30:00.000Z");
    expect(store).toBe("2024-01-15T10:30:00.000Z");
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

describe("createCookieGroup", () => {
  it("gets all cookie values at once", async () => {
    let sessionStore: string | undefined = "abc123";
    let userStore: string | undefined = JSON.stringify({ id: 1, name: "John" });

    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => sessionStore,
      set: (v) => {
        sessionStore = v;
      },
      delete: () => {
        sessionStore = undefined;
      },
    });

    const userCookie = createCookie<{ id: number; name: string }>({
      name: "user",
      get: () => userStore,
      set: (v) => {
        userStore = v;
      },
      delete: () => {
        userStore = undefined;
      },
    });

    const group = createCookieGroup({
      session: sessionCookie,
      user: userCookie,
    });
    const values = await group.get();

    expect(values).toEqual({
      session: "abc123",
      user: { id: 1, name: "John" },
    });
  });

  it("returns undefined for missing cookies", async () => {
    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup({ session: sessionCookie });
    const values = await group.get();

    expect(values).toEqual({ session: undefined });
  });

  it("provides access to individual cookies", async () => {
    let store: string | undefined;

    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => store,
      set: (v) => {
        store = v;
      },
      delete: () => {
        store = undefined;
      },
    });

    const group = createCookieGroup({ session: sessionCookie });

    await group.session.set("token123");
    expect(await group.session.get()).toBe("token123");
  });

  it("deletes all cookies with deleteAll", async () => {
    let sessionStore: string | undefined = "abc";
    let userStore: string | undefined = "xyz";

    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => sessionStore,
      set: (v) => {
        sessionStore = v;
      },
      delete: () => {
        sessionStore = undefined;
      },
    });

    const userCookie = createCookie<string>({
      name: "user",
      get: () => userStore,
      set: (v) => {
        userStore = v;
      },
      delete: () => {
        userStore = undefined;
      },
    });

    const group = createCookieGroup({
      session: sessionCookie,
      user: userCookie,
    });

    await group.deleteAll();

    expect(sessionStore).toBe(undefined);
    expect(userStore).toBe(undefined);
  });

  it("sets partial cookies with set", async () => {
    let sessionStore: string | undefined;
    let userStore: string | undefined;

    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => sessionStore,
      set: (v) => {
        sessionStore = v;
      },
      delete: () => {
        sessionStore = undefined;
      },
    });

    const userCookie = createCookie<{ id: number }>({
      name: "user",
      get: () => userStore,
      set: (v) => {
        userStore = v;
      },
      delete: () => {
        userStore = undefined;
      },
    });

    const group = createCookieGroup({
      session: sessionCookie,
      user: userCookie,
    });

    await group.set({ session: "token123" });

    expect(sessionStore).toBe("token123");
    expect(userStore).toBe(undefined);
  });

  it("sets all cookies with set", async () => {
    let sessionStore: string | undefined;
    let userStore: string | undefined;

    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => sessionStore,
      set: (v) => {
        sessionStore = v;
      },
      delete: () => {
        sessionStore = undefined;
      },
    });

    const userCookie = createCookie<{ id: number }>({
      name: "user",
      get: () => userStore,
      set: (v) => {
        userStore = v;
      },
      delete: () => {
        userStore = undefined;
      },
    });

    const group = createCookieGroup({
      session: sessionCookie,
      user: userCookie,
    });

    await group.set({ session: "token", user: { id: 42 } });

    expect(sessionStore).toBe("token");
    expect(userStore).toBe(JSON.stringify({ id: 42 }));
  });

  it("passes options to set when using group set", async () => {
    let receivedOptions: unknown;

    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: (_v, options) => {
        receivedOptions = options;
      },
      delete: () => {},
    });

    const group = createCookieGroup({ session: sessionCookie });

    await group.set({ session: "token" }, { maxAge: 7200, secure: true });

    expect(receivedOptions).toEqual({ maxAge: 7200, secure: true });
  });

  it("prefixes cookie names when prefix option is provided", async () => {
    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const userCookie = createCookie<string>({
      name: "user",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup(
      { session: sessionCookie, user: userCookie },
      { prefix: "auth_" },
    );

    expect(group.session.name).toBe("auth_session");
    expect(group.user.name).toBe("auth_user");
  });

  it("applies default cookie options to all set operations", async () => {
    const receivedOptions: unknown[] = [];

    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: (_v, options) => {
        receivedOptions.push(options);
      },
      delete: () => {},
    });

    const userCookie = createCookie<string>({
      name: "user",
      get: () => undefined,
      set: (_v, options) => {
        receivedOptions.push(options);
      },
      delete: () => {},
    });

    const group = createCookieGroup(
      { session: sessionCookie, user: userCookie },
      { defaults: { secure: true, httpOnly: true } },
    );

    await group.set({ session: "token", user: "john" });

    expect(receivedOptions[0]).toEqual({ secure: true, httpOnly: true });
    expect(receivedOptions[1]).toEqual({ secure: true, httpOnly: true });
  });

  it("allows overriding default options per set call", async () => {
    let receivedOptions: unknown;

    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: (_v, options) => {
        receivedOptions = options;
      },
      delete: () => {},
    });

    const group = createCookieGroup(
      { session: sessionCookie },
      { defaults: { secure: true, maxAge: 3600 } },
    );

    await group.set({ session: "token" }, { maxAge: 7200 });

    expect(receivedOptions).toEqual({ secure: true, maxAge: 7200 });
  });

  it("applies default options when using individual cookie set", async () => {
    let receivedOptions: unknown;

    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: (_v, options) => {
        receivedOptions = options;
      },
      delete: () => {},
    });

    const group = createCookieGroup(
      { session: sessionCookie },
      { defaults: { secure: true, httpOnly: true } },
    );

    await group.session.set("token");

    expect(receivedOptions).toEqual({ secure: true, httpOnly: true });
  });

  it("combines prefix and defaults options", async () => {
    let receivedOptions: unknown;

    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: (_v, options) => {
        receivedOptions = options;
      },
      delete: () => {},
    });

    const group = createCookieGroup(
      { session: sessionCookie },
      { prefix: "app_", defaults: { secure: true } },
    );

    expect(group.session.name).toBe("app_session");

    await group.session.set("token");
    expect(receivedOptions).toEqual({ secure: true });
  });
});
