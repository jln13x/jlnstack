import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expectTypeOf, test } from "vitest";
import type { Cookie, CookieOptions } from "../src/browser";
import { createCookie } from "../src/browser";

declare const stringSchema: StandardSchemaV1<string>;
declare const objectSchema: StandardSchemaV1<{ sort: string; order: string }>;

describe("browser createCookie types", () => {
  test("returns Cookie type with correct value type", () => {
    const cookie = createCookie<string>("theme");

    expectTypeOf(cookie).toMatchTypeOf<Cookie<string>>();
    expectTypeOf(cookie.get()).toEqualTypeOf<Promise<string | undefined>>();
    expectTypeOf(cookie.name).toEqualTypeOf<string>();
  });

  test("generic type is enforced on set", () => {
    const cookie = createCookie<"light" | "dark">("theme");

    expectTypeOf(cookie.get()).toEqualTypeOf<
      Promise<"light" | "dark" | undefined>
    >();

    // @ts-expect-error - value should be "light" | "dark"
    cookie.set("invalid");
  });

  test("schema infers value type", () => {
    const cookie = createCookie("filter", { schema: objectSchema });

    expectTypeOf(cookie.get()).toEqualTypeOf<
      Promise<{ sort: string; order: string } | undefined>
    >();
  });

  test("set accepts CookieOptions", () => {
    const cookie = createCookie<string>("session");

    cookie.set("value", { maxAge: 3600, secure: true, sameSite: "strict" });
  });

  test("CookieOptions type is exported", () => {
    const options: CookieOptions = {
      maxAge: 3600,
      expires: new Date(),
      path: "/",
      domain: "example.com",
      secure: true,
      httpOnly: true,
      sameSite: "lax",
    };

    expectTypeOf(options).toMatchTypeOf<CookieOptions>();
  });
});
