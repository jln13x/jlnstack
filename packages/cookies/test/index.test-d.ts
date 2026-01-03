import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expectTypeOf, test } from "vitest";
import { createCookie } from "../src/index";
import type { Cookie } from "../src/types";

declare const stringSchema: StandardSchemaV1<string>;
declare const objectSchema: StandardSchemaV1<{ sort: string; order: string }>;

describe("createCookie types", () => {
  test("returns Cookie type with correct value type", () => {
    const cookie = createCookie<string>({
      name: "theme",
      get: () => undefined,
      set: () => {},
      delete: () => {},
    });

    expectTypeOf(cookie).toMatchTypeOf<Cookie<string>>();
    expectTypeOf(cookie.get()).toEqualTypeOf<Promise<string | undefined>>();
    expectTypeOf(cookie.name).toEqualTypeOf<string>();
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
