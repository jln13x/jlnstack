import { expectTypeOf, test } from "vitest";
import { createRoutes, type RouteNode } from "../src/index";

type AppRoutes =
  | "/"
  | "/dashboard"
  | "/dashboard/settings"
  | "/blog/[slug]"
  | "/users/[id]/posts/[postId]"
  | "/docs/[...path]"
  | "/shop/[[...filters]]";

const routes = createRoutes<AppRoutes>() as RouteNode<AppRoutes, "", {}>;

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
