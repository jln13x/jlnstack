import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expectTypeOf, test } from "vitest";
import { createRoutes } from "../src/index";

type AppRoutes =
  | "/"
  | "/dashboard"
  | "/dashboard/settings"
  | "/blog/[slug]"
  | "/users/[id]/posts/[postId]"
  | "/docs/[...path]"
  | "/shop/[[...filters]]";

const routes = createRoutes<AppRoutes>();

test("root route returns literal '/'", () => {
  const route = routes.getRoute();
  expectTypeOf(route).toEqualTypeOf<"/">();
});

test("static segment returns literal path", () => {
  const route = routes.dashboard.getRoute();
  expectTypeOf(route).toEqualTypeOf<"/dashboard">();
});

test("nested static segments return literal path", () => {
  const route = routes.dashboard.settings.getRoute();
  expectTypeOf(route).toEqualTypeOf<"/dashboard/settings">();
});

test("dynamic param requires string param", () => {
  const route = routes.blog.slug.getRoute({ slug: "my-article" });
  expectTypeOf(route).toEqualTypeOf<"/blog/my-article">();
});

test("nested dynamic params require all params", () => {
  const route = routes.users.id.posts.postId.getRoute({
    id: "123",
    postId: "456",
  });
  expectTypeOf(route).toEqualTypeOf<"/users/123/posts/456">();
});

test("catch-all requires string array param", () => {
  const route = routes.docs.path.getRoute({
    path: ["api", "reference"],
  });
  expectTypeOf(route).toMatchTypeOf<"/docs/api/reference">();
});

test("optional catch-all accepts string array", () => {
  const route = routes.shop.filters.getRoute({
    filters: ["color", "red"],
  });
  expectTypeOf(route).toMatchTypeOf<"/shop/color/red">();
});

test("optional catch-all accepts undefined", () => {
  const route = routes.shop.filters.getRoute({ filters: undefined });
  expectTypeOf(route).toMatchTypeOf<"/shop">();
});

type ParamMapRoutes =
  | "/dashboard/[slug]"
  | "/dashboard/[slug]/nested/[id]"
  | "/blog/[postId]";

interface CustomParamMap {
  "/dashboard/[slug]": { slug: number };
  "/dashboard/[slug]/nested/[id]": { slug: number; id: boolean };
}

test("ParamMap type is used for params when provided", () => {
  const paramMapRoutes = createRoutes<ParamMapRoutes, CustomParamMap>();

  paramMapRoutes.dashboard.slug.getRoute({ slug: 42 });
  // @ts-expect-error - slug should be number, not string
  paramMapRoutes.dashboard.slug.getRoute({ slug: "invalid" });
});

test("default string type is used when no ParamMap entry exists", () => {
  const paramMapRoutes = createRoutes<ParamMapRoutes, CustomParamMap>();

  paramMapRoutes.blog.postId.getRoute({ postId: "string-value" });
  // @ts-expect-error - postId should be string (no ParamMap entry), not number
  paramMapRoutes.blog.postId.getRoute({ postId: 123 });
});

test("partial ParamMap works - only some params have custom types", () => {
  interface PartialParamMap {
    "/dashboard/[slug]/nested/[id]": { slug: number };
  }

  const partialRoutes = createRoutes<ParamMapRoutes, PartialParamMap>();

  const route = partialRoutes.dashboard.slug.nested.id.getRoute({
    slug: 42,
    id: "string-id",
  });

  expectTypeOf(route).toEqualTypeOf<"/dashboard/42/nested/string-id">();
});

test("multiple params can have different custom types", () => {
  const customRoutes = createRoutes<ParamMapRoutes, CustomParamMap>();

  customRoutes.dashboard.slug.nested.id.getRoute({
    slug: 42,
    id: true,
  });
});

test("return type is literal string when custom types are used", () => {
  const customRoutes = createRoutes<ParamMapRoutes, CustomParamMap>();

  const route = customRoutes.dashboard.slug.getRoute({ slug: 42 });
  expectTypeOf(route).toEqualTypeOf<"/dashboard/42">();
});

test("no ParamMap still works (infers from route pattern)", () => {
  const noParamMapRoutes = createRoutes<ParamMapRoutes>();
  noParamMapRoutes.dashboard.slug.getRoute({ slug: "string-value" });
  const route = noParamMapRoutes.dashboard.slug.getRoute({ slug: "test" });
  expectTypeOf(route).toEqualTypeOf<"/dashboard/test">();
});

test("empty ParamMap still works", () => {
  const emptyParamMapRoutes = createRoutes<ParamMapRoutes, {}>();
  emptyParamMapRoutes.dashboard.slug.getRoute({ slug: "string-value" });
});

test("nested objects are rejected in ParamMap", () => {
  createRoutes<
    "/dashboard/users/[id]",
    // @ts-expect-error - nested objects are not allowed as param values
    {
      "/dashboard/users/[id]": {
        id: {
          foo: {
            bar: string;
          };
        };
      };
    }
  >();
});

declare const numberSchema: StandardSchemaV1<unknown, number>;
declare const booleanSchema: StandardSchemaV1<unknown, boolean>;

test("StandardSchema extracts output type for params", () => {
  const schemaRoutes = createRoutes({
    "/users/[id]": { id: numberSchema },
  });

  schemaRoutes.users.id.getRoute({ id: 42 });
  // @ts-expect-error - id should be number (from schema output), not string
  schemaRoutes.users.id.getRoute({ id: "invalid" });
});

test("StandardSchema works with multiple params", () => {
  const schemaRoutes = createRoutes({
    "/users/[id]/posts/[postId]": {
      id: numberSchema,
      postId: booleanSchema,
    },
  });

  schemaRoutes.users.id.posts.postId.getRoute({ id: 42, postId: true });
  // @ts-expect-error - id should be number, postId should be boolean
  schemaRoutes.users.id.posts.postId.getRoute({ id: "invalid", postId: 123 });
});

test("StandardSchema can be mixed with raw types via explicit generics", () => {
  const mixedRoutes = createRoutes<
    "/users/[id]/posts/[postId]",
    {
      "/users/[id]/posts/[postId]": {
        id: StandardSchemaV1<unknown, number>;
        postId: boolean;
      };
    }
  >();

  mixedRoutes.users.id.posts.postId.getRoute({ id: 42, postId: true });
});

test("multiple routes with partial schema coverage", () => {
  const schemaRoutes = createRoutes({
    "/users/[id]": { id: numberSchema },
    "/blog/[slug]": {},
  });

  schemaRoutes.users.id.getRoute({ id: 42 });
  schemaRoutes.blog.slug.getRoute({ slug: "my-post" });
});

test("createRoutes without schema map still works", () => {
  const noSchemaRoutes = createRoutes<"/users/[id]">();
  noSchemaRoutes.users.id.getRoute({ id: "string-value" });
});

test("return type works with schema params", () => {
  const schemaRoutes = createRoutes({
    "/users/[id]": { id: numberSchema },
  });

  const route = schemaRoutes.users.id.getRoute({ id: 42 });
  expectTypeOf(route).toEqualTypeOf<"/users/42">();
});

describe("search params", () => {
  type SearchParamRoutes = "/dashboard" | "/blog/[slug]" | "/users/[id]";

  interface CustomSearchParamMap {
    "/dashboard": { page: number; sort: string };
    "/blog/[slug]": { highlight: boolean };
  }

  test("getRoute accepts optional search params as 2nd parameter", () => {
    const routes = createRoutes<SearchParamRoutes, {}, CustomSearchParamMap>();

    routes.dashboard.getRoute(undefined, { page: 1, sort: "asc" });
    routes.blog.slug.getRoute({ slug: "my-post" }, { highlight: true });
  });

  test("search params are typed when mapping exists", () => {
    const routes = createRoutes<SearchParamRoutes, {}, CustomSearchParamMap>();

    // @ts-expect-error - page should be number, not string
    routes.dashboard.getRoute(undefined, { page: "invalid" });

    // @ts-expect-error - highlight should be boolean, not string
    routes.blog.slug.getRoute({ slug: "test" }, { highlight: "invalid" });
  });

  test("search params fallback to generic record when no mapping", () => {
    const routes = createRoutes<SearchParamRoutes, {}, CustomSearchParamMap>();

    routes.users.id.getRoute(
      { id: "123" },
      { anyParam: "value", another: ["a", "b"] },
    );
  });

  test("search params are optional even when mapping exists", () => {
    const routes = createRoutes<SearchParamRoutes, {}, CustomSearchParamMap>();

    routes.dashboard.getRoute();
    routes.dashboard.getRoute(undefined);
    routes.blog.slug.getRoute({ slug: "test" });
  });

  test("individual search params are optional", () => {
    const routes = createRoutes<SearchParamRoutes, {}, CustomSearchParamMap>();

    routes.dashboard.getRoute(undefined, { page: 1 });
    routes.dashboard.getRoute(undefined, { sort: "asc" });
    routes.dashboard.getRoute(undefined, {});
  });

  test("root route accepts search params", () => {
    const routes = createRoutes<"/" | "/about", {}, { "/": { foo: string } }>();

    routes.getRoute(undefined, { foo: "bar" });
  });

  test("StandardSchema works for search params", () => {
    const stringSchema = {} as StandardSchemaV1<unknown, string>;
    const numberSchema2 = {} as StandardSchemaV1<unknown, number>;
    const routes = createRoutes<
      "/search",
      {},
      { "/search": { q: typeof stringSchema; limit: typeof numberSchema2 } }
    >();

    const route = routes.search.getRoute(undefined, { q: "hello", limit: 10 });
    expectTypeOf(route).toEqualTypeOf<"/search?q=hello&limit=10">();
    // @ts-expect-error - q should be string (from schema output), not number
    routes.search.getRoute(undefined, { q: 123 });
  });
});
