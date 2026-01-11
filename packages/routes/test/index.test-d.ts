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

const routes = createRoutes<AppRoutes>()();

test("root route returns literal '/'", () => {
  const route = routes.getRoute();
  expectTypeOf(route).toEqualTypeOf<"/">();
});

test("empty string index is not valid", () => {
  // @ts-expect-error - routes[""] should not be valid, only routes.getRoute() for root
  routes[""].getRoute();
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
  expectTypeOf(route).toExtend<"/docs/api/reference">();
});

test("optional catch-all accepts string array", () => {
  const route = routes.shop.filters.getRoute({
    filters: ["color", "red"],
  });
  expectTypeOf(route).toExtend<"/shop/color/red">();
});

test("optional catch-all accepts undefined", () => {
  const route = routes.shop.filters.getRoute({ filters: undefined });
  expectTypeOf(route).toExtend<"/shop">();
});

type ParamMapRoutes =
  | "/dashboard/[slug]"
  | "/dashboard/[slug]/nested/[id]"
  | "/blog/[postId]";

test("ParamMap type is used for params when provided", () => {
  const paramMapRoutes = createRoutes<ParamMapRoutes>()({
    "/dashboard/[slug]": { params: { slug: 42 as number } },
    "/dashboard/[slug]/nested/[id]": {
      params: { slug: 42 as number, id: true as boolean },
    },
  });

  paramMapRoutes.dashboard.slug.getRoute({ slug: 42 });
  // @ts-expect-error - slug should be number, not string
  paramMapRoutes.dashboard.slug.getRoute({ slug: "invalid" });
});

test("default string type is used when no ParamMap entry exists", () => {
  const paramMapRoutes = createRoutes<ParamMapRoutes>()({
    "/dashboard/[slug]": { params: { slug: 42 as number } },
  });

  paramMapRoutes.blog.postId.getRoute({ postId: "string-value" });
  // @ts-expect-error - postId should be string (no ParamMap entry), not number
  paramMapRoutes.blog.postId.getRoute({ postId: 123 });
});

test("partial ParamMap works - only some params have custom types", () => {
  const partialRoutes = createRoutes<ParamMapRoutes>()({
    "/dashboard/[slug]/nested/[id]": { params: { slug: 42 as number } },
  });

  const route = partialRoutes.dashboard.slug.nested.id.getRoute({
    slug: 42,
    id: "string-id",
  });

  expectTypeOf(route).toEqualTypeOf<"/dashboard/42/nested/string-id">();
});

test("multiple params can have different custom types", () => {
  const customRoutes = createRoutes<ParamMapRoutes>()({
    "/dashboard/[slug]/nested/[id]": {
      params: { slug: 42 as number, id: true as boolean },
    },
  });

  customRoutes.dashboard.slug.nested.id.getRoute({
    slug: 42,
    id: true,
  });
});

test("return type is literal string when custom types are used", () => {
  const customRoutes = createRoutes<ParamMapRoutes>()({
    "/dashboard/[slug]": { params: { slug: 42 as number } },
  });

  const route = customRoutes.dashboard.slug.getRoute({ slug: 42 });
  expectTypeOf(route).toEqualTypeOf<"/dashboard/42">();
});

test("no ParamMap still works (infers from route pattern)", () => {
  const noParamMapRoutes = createRoutes<ParamMapRoutes>()();
  noParamMapRoutes.dashboard.slug.getRoute({ slug: "string-value" });
  const route = noParamMapRoutes.dashboard.slug.getRoute({ slug: "test" });
  expectTypeOf(route).toEqualTypeOf<"/dashboard/test">();
});

test("empty config still works", () => {
  const emptyConfigRoutes = createRoutes<ParamMapRoutes>()({});
  emptyConfigRoutes.dashboard.slug.getRoute({ slug: "string-value" });
});

test("nested objects are rejected in params", () => {
  createRoutes<"/dashboard/users/[id]">()({
    "/dashboard/users/[id]": {
      params: {
        // @ts-expect-error - nested objects are not allowed as param values
        id: { foo: "bar" },
      },
    },
  });
});

test("only declared routes are allowed as config keys", () => {
  type Routes = "/users/[id]" | "/posts/[slug]";

  createRoutes<Routes>()({
    "/users/[id]": { params: { id: "123" } },
    // @ts-expect-error - "/invalid/route" is not in Routes
    "/invalid/route": { params: {} },
  });
});

test("only route params are allowed as param keys", () => {
  const params: { [K in "id" | "postId"]?: string } = {
    id: "123",
    postId: "456",
    // @ts-expect-error - 'invalid' is not a param in this route
    invalid: "value",
  };
  createRoutes<"/users/[id]/posts/[postId]">()({
    "/users/[id]/posts/[postId]": { params },
  });
});

test("catch-all params are extracted correctly", () => {
  const params: { [K in "path"]?: string[] } = {
    path: ["a", "b"],
    // @ts-expect-error - 'other' is not a param in this route
    other: "value",
  };
  createRoutes<"/docs/[...path]">()({
    "/docs/[...path]": { params },
  });
});

test("optional catch-all params are extracted correctly", () => {
  const params: { [K in "filters"]?: string[] } = {
    filters: ["color", "red"],
    // @ts-expect-error - 'other' is not a param in this route
    other: "value",
  };
  createRoutes<"/shop/[[...filters]]">()({
    "/shop/[[...filters]]": { params },
  });
});

declare const numberSchema: StandardSchemaV1<unknown, number>;
declare const booleanSchema: StandardSchemaV1<unknown, boolean>;

test("StandardSchema extracts output type for params", () => {
  const schemaRoutes = createRoutes<"/users/[id]">()({
    "/users/[id]": { params: { id: numberSchema } },
  });

  schemaRoutes.users.id.getRoute({ id: 42 });
  // @ts-expect-error - id should be number (from schema output), not string
  schemaRoutes.users.id.getRoute({ id: "invalid" });
});

test("StandardSchema works with multiple params", () => {
  const schemaRoutes = createRoutes<"/users/[id]/posts/[postId]">()({
    "/users/[id]/posts/[postId]": {
      params: {
        id: numberSchema,
        postId: booleanSchema,
      },
    },
  });

  schemaRoutes.users.id.posts.postId.getRoute({ id: 42, postId: true });
  // @ts-expect-error - id should be number, postId should be boolean
  schemaRoutes.users.id.posts.postId.getRoute({ id: "invalid", postId: 123 });
});

test("StandardSchema can be mixed with raw types", () => {
  const mixedRoutes = createRoutes<"/users/[id]/posts/[postId]">()({
    "/users/[id]/posts/[postId]": {
      params: {
        id: numberSchema,
        postId: true as boolean,
      },
    },
  });

  mixedRoutes.users.id.posts.postId.getRoute({ id: 42, postId: true });
});

test("multiple routes with partial schema coverage", () => {
  const schemaRoutes = createRoutes<"/users/[id]" | "/blog/[slug]">()({
    "/users/[id]": { params: { id: numberSchema } },
  });

  schemaRoutes.users.id.getRoute({ id: 42 });
  schemaRoutes.blog.slug.getRoute({ slug: "my-post" });
});

test("createRoutes without config still works", () => {
  const noSchemaRoutes = createRoutes<"/users/[id]">()();
  noSchemaRoutes.users.id.getRoute({ id: "string-value" });
});

test("return type works with schema params", () => {
  const schemaRoutes = createRoutes<"/users/[id]">()({
    "/users/[id]": { params: { id: numberSchema } },
  });

  const route = schemaRoutes.users.id.getRoute({ id: 42 });
  expectTypeOf(route).toEqualTypeOf<"/users/42">();
});

describe("search params", () => {
  type SearchParamRoutes = "/dashboard" | "/blog/[slug]" | "/users/[id]";

  test("getRoute accepts optional search params as 2nd parameter", () => {
    const routes = createRoutes<SearchParamRoutes>()({
      "/dashboard": { searchParams: { page: 1 as number, sort: "" as string } },
      "/blog/[slug]": { searchParams: { highlight: true as boolean } },
    });

    routes.dashboard.getRoute(undefined, { page: 1, sort: "asc" });
    routes.blog.slug.getRoute({ slug: "my-post" }, { highlight: true });
  });

  test("search params are typed when mapping exists", () => {
    const routes = createRoutes<SearchParamRoutes>()({
      "/dashboard": { searchParams: { page: 1 as number } },
      "/blog/[slug]": { searchParams: { highlight: true as boolean } },
    });

    // @ts-expect-error - page should be number, not string
    routes.dashboard.getRoute(undefined, { page: "invalid" });

    // @ts-expect-error - highlight should be boolean, not string
    routes.blog.slug.getRoute({ slug: "test" }, { highlight: "invalid" });
  });

  test("search params fallback to generic record when no mapping", () => {
    const routes = createRoutes<SearchParamRoutes>()({
      "/dashboard": { searchParams: { page: 1 as number } },
    });

    routes.users.id.getRoute(
      { id: "123" },
      { anyParam: "value", another: ["a", "b"] },
    );
  });

  test("search params are optional even when mapping exists", () => {
    const routes = createRoutes<SearchParamRoutes>()({
      "/dashboard": { searchParams: { page: 1 as number, sort: "" as string } },
      "/blog/[slug]": { searchParams: { highlight: true as boolean } },
    });

    routes.dashboard.getRoute();
    routes.dashboard.getRoute(undefined);
    routes.blog.slug.getRoute({ slug: "test" });
  });

  test("individual search params are optional", () => {
    const routes = createRoutes<SearchParamRoutes>()({
      "/dashboard": { searchParams: { page: 1 as number, sort: "" as string } },
    });

    routes.dashboard.getRoute(undefined, { page: 1 });
    routes.dashboard.getRoute(undefined, { sort: "asc" });
    routes.dashboard.getRoute(undefined, {});
  });

  test("root route accepts search params", () => {
    const routes = createRoutes<"/" | "/about">()({
      "/": { searchParams: { foo: "" as string } },
    });

    routes.getRoute(undefined, { foo: "bar" });
  });

  test("StandardSchema works for search params", () => {
    const stringSchema = {} as StandardSchemaV1<unknown, string>;
    const numberSchema2 = {} as StandardSchemaV1<unknown, number>;
    const routes = createRoutes<"/search">()({
      "/search": { searchParams: { q: stringSchema, limit: numberSchema2 } },
    });

    const route = routes.search.getRoute(undefined, { q: "hello", limit: 10 });
    expectTypeOf(route).toEqualTypeOf<"/search?q=hello&limit=10">();
    // @ts-expect-error - q should be string (from schema output), not number
    routes.search.getRoute(undefined, { q: 123 });
  });

  test("array search params are included in return type", () => {
    const routes = createRoutes<"/foo/bar">()({
      "/foo/bar": {
        searchParams: {
          test: "" as string,
          asd: 0 as number,
          b: [] as string[],
          c: true as boolean,
        },
      },
    });

    const route = routes.foo.bar.getRoute(undefined, {
      b: ["123", "456"],
    });
    expectTypeOf(route).toEqualTypeOf<"/foo/bar?b=123&b=456">();
  });

  test("multiple array elements produce multiple query pairs", () => {
    const routes = createRoutes<"/items">()({
      "/items": { searchParams: { tags: [] as string[] } },
    });

    const route = routes.items.getRoute(undefined, { tags: ["a", "b", "c"] });
    expectTypeOf(route).toEqualTypeOf<"/items?tags=a&tags=b&tags=c">();
  });
});
