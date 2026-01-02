import { expectTypeOf, test } from "vitest";
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
