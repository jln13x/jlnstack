import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expectTypeOf, test } from "vitest";
import { createCookie, createCookieGroup } from "../src/index";
import type { Cookie, CookieGroup } from "../src/types";

declare const objectSchema: StandardSchemaV1<{ sort: string; order: string }>;

describe("createCookie types", () => {
  test("returns Cookie type with correct value type", () => {
    const cookie = createCookie<string>({
      name: "theme",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    expectTypeOf(cookie).toExtend<Cookie<string>>();
    expectTypeOf(cookie.get()).toEqualTypeOf<Promise<string | undefined>>();
    expectTypeOf(cookie.name).toEqualTypeOf<string>();
  });

  test("defaults to string type when no schema and no generic", () => {
    const cookie = createCookie({
      name: "theme",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    expectTypeOf(cookie).toExtend<Cookie<string>>();
    expectTypeOf(cookie.get()).toEqualTypeOf<Promise<string | undefined>>();
  });

  test("generic type is enforced on get and set", () => {
    const cookie = createCookie<"light" | "dark">({
      name: "theme",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    expectTypeOf(cookie.get()).toEqualTypeOf<
      Promise<"light" | "dark" | undefined>
    >();

    // @ts-expect-error - value should be "light" | "dark"
    cookie.set("invalid");
  });

  test("schema infers value type", () => {
    const cookie = createCookie({
      name: "filter",
      schema: objectSchema,
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    expectTypeOf(cookie.get()).toEqualTypeOf<
      Promise<{ sort: string; order: string } | undefined>
    >();
  });

  test("set accepts CookieOptions", () => {
    const cookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    cookie.set("value", { maxAge: 3600, secure: true, sameSite: "strict" });
  });
});

describe("createCookieGroup types", () => {
  test("returns CookieGroupWithCookies with correct types", () => {
    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const userCookie = createCookie<{ id: number; name: string }>({
      name: "user",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup({
      session: sessionCookie,
      user: userCookie,
    });

    expectTypeOf(group).toExtend<
      CookieGroup<{
        session: Cookie<string>;
        user: Cookie<{ id: number; name: string }>;
      }>
    >();
  });

  test("get returns object with all cookie values", async () => {
    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const userCookie = createCookie<{ id: number }>({
      name: "user",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup({
      session: sessionCookie,
      user: userCookie,
    });

    expectTypeOf(group.get()).toEqualTypeOf<
      Promise<{
        session: string | undefined;
        user: { id: number } | undefined;
      }>
    >();
  });

  test("individual cookies are accessible as properties", () => {
    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup({ session: sessionCookie });

    expectTypeOf(group.session).toExtend<Cookie<string>>();
    expectTypeOf(group.session.get()).toEqualTypeOf<
      Promise<string | undefined>
    >();
  });

  test("deleteAll returns Promise<void>", () => {
    const cookie = createCookie<string>({
      name: "test",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup({ test: cookie });

    expectTypeOf(group.deleteAll()).toEqualTypeOf<Promise<void>>();
  });

  test("set accepts partial values", () => {
    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const userCookie = createCookie<{ id: number }>({
      name: "user",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup({
      session: sessionCookie,
      user: userCookie,
    });

    group.set({ session: "token" });
    group.set({ user: { id: 1 } });
    group.set({ session: "token", user: { id: 1 } });
  });

  test("set rejects invalid value types", () => {
    const sessionCookie = createCookie<string>({
      name: "session",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup({ session: sessionCookie });

    // @ts-expect-error - value should be string
    group.set({ session: 123 });
  });

  test("set accepts CookieOptions", () => {
    const cookie = createCookie<string>({
      name: "test",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup({ test: cookie });

    group.set({ test: "value" }, { maxAge: 3600, secure: true });
  });

  test("set returns Promise<void>", () => {
    const cookie = createCookie<string>({
      name: "test",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup({ test: cookie });

    expectTypeOf(group.set({ test: "value" })).toEqualTypeOf<Promise<void>>();
  });

  test("accepts options with prefix", () => {
    const cookie = createCookie<string>({
      name: "test",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup({ test: cookie }, { prefix: "app_" });

    expectTypeOf(group.test.name).toEqualTypeOf<string>();
  });

  test("accepts options with defaults", () => {
    const cookie = createCookie<string>({
      name: "test",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup(
      { test: cookie },
      { defaults: { secure: true, httpOnly: true } },
    );

    expectTypeOf(group).toExtend<CookieGroup<{ test: Cookie<string> }>>();
  });

  test("accepts options with both prefix and defaults", () => {
    const cookie = createCookie<string>({
      name: "test",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    const group = createCookieGroup(
      { test: cookie },
      { prefix: "app_", defaults: { secure: true } },
    );

    expectTypeOf(group.test.name).toEqualTypeOf<string>();
  });
});
