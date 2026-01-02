import { describe, expect, it } from "vitest";
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

describe("createRoutes", () => {
  it("returns root route", () => {
    const route = routes.getRoute();
    expect(route).toBe("/");
  });

  it("returns static segment", () => {
    const route = routes.dashboard.getRoute();
    expect(route).toBe("/dashboard");
  });

  it("returns nested static segments", () => {
    const route = routes.dashboard.settings.getRoute();
    expect(route).toBe("/dashboard/settings");
  });

  it("returns dynamic param route", () => {
    const route = routes.blog.slug.getRoute({ slug: "my-article" });
    expect(route).toBe("/blog/my-article");
  });

  it("returns nested dynamic params route", () => {
    const route = routes.users.id.posts.postId.getRoute({
      id: "123",
      postId: "456",
    });
    expect(route).toBe("/users/123/posts/456");
  });

  it("returns catch-all route", () => {
    const route = routes.docs.path.getRoute({ path: ["api", "reference"] });
    expect(route).toBe("/docs/api/reference");
  });

  it("returns optional catch-all with value", () => {
    const route = routes.shop.filters.getRoute({ filters: ["color", "red"] });
    expect(route).toBe("/shop/color/red");
  });

  it("returns optional catch-all without value", () => {
    const route = routes.shop.filters.getRoute({ filters: undefined });
    expect(route).toBe("/shop");
  });
});
