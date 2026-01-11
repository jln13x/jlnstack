import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { createRoutes } from "../src/index";

function createMockSchema<T>(
  transform: (value: unknown) => T,
): StandardSchemaV1<unknown, T> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value) => ({ value: transform(value) }),
    },
  };
}

function createFailingSchema(
  message: string,
): StandardSchemaV1<unknown, never> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => ({ issues: [{ message }] }),
    },
  };
}

function createAsyncSchema(): StandardSchemaV1<unknown, string> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => Promise.resolve({ value: "async" }),
    },
  };
}

type AppRoutes =
  | "/"
  | "/dashboard"
  | "/dashboard/settings"
  | "/blog/[slug]"
  | "/users/[id]/posts/[postId]"
  | "/docs/[...path]"
  | "/shop/[[...filters]]";

const routes = createRoutes<AppRoutes>()();

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

describe("search params", () => {
  it("appends search params to route", () => {
    const route = routes.dashboard.getRoute(undefined, {
      page: "1",
      sort: "asc",
    });
    expect(route).toBe("/dashboard?page=1&sort=asc");
  });

  it("appends search params to dynamic route", () => {
    const route = routes.blog.slug.getRoute(
      { slug: "my-post" },
      { highlight: "true" },
    );
    expect(route).toBe("/blog/my-post?highlight=true");
  });

  it("handles array search params", () => {
    const route = routes.dashboard.getRoute(undefined, {
      tags: ["a", "b", "c"],
    });
    expect(route).toBe("/dashboard?tags=a&tags=b&tags=c");
  });

  it("handles numeric search params", () => {
    const route = routes.dashboard.getRoute(undefined, { page: 1, limit: 10 });
    expect(route).toBe("/dashboard?page=1&limit=10");
  });

  it("handles boolean search params", () => {
    const route = routes.dashboard.getRoute(undefined, {
      active: true,
      deleted: false,
    });
    expect(route).toBe("/dashboard?active=true&deleted=false");
  });

  it("skips undefined search params", () => {
    const route = routes.dashboard.getRoute(undefined, {
      page: 1,
      sort: undefined,
    });
    expect(route).toBe("/dashboard?page=1");
  });

  it("skips null search params", () => {
    const route = routes.dashboard.getRoute(undefined, {
      page: 1,
      sort: null as unknown as string,
    });
    expect(route).toBe("/dashboard?page=1");
  });

  it("returns path without query string when no search params", () => {
    const route = routes.dashboard.getRoute(undefined, {});
    expect(route).toBe("/dashboard");
  });

  it("returns path without query string when search params is undefined", () => {
    const route = routes.dashboard.getRoute(undefined, undefined);
    expect(route).toBe("/dashboard");
  });

  it("works with root route", () => {
    const route = routes.getRoute(undefined, { foo: "bar" });
    expect(route).toBe("/?foo=bar");
  });
});

describe("createRoutes with schemas", () => {
  it("validates and transforms params using schema", () => {
    const numberSchema = createMockSchema((v) => Number(v));
    const schemaRoutes = createRoutes<"/users/[id]">()({
      "/users/[id]": { params: { id: numberSchema } },
    });

    const route = schemaRoutes.users.id.getRoute({ id: 42 });
    expect(route).toBe("/users/42");
  });

  it("transforms string to number via schema", () => {
    const numberSchema = createMockSchema((v) => Number(v) * 2);
    const schemaRoutes = createRoutes<"/users/[id]">()({
      "/users/[id]": { params: { id: numberSchema } },
    });

    const route = schemaRoutes.users.id.getRoute({ id: 5 });
    expect(route).toBe("/users/10");
  });

  it("throws on validation failure", () => {
    const failingSchema = createFailingSchema("Invalid id");
    const schemaRoutes = createRoutes<"/users/[id]">()({
      "/users/[id]": { params: { id: failingSchema } },
    });

    expect(() => schemaRoutes.users.id.getRoute({ id: "bad" })).toThrow(
      'Validation failed for param "id": Invalid id',
    );
  });

  it("throws on async validation", () => {
    const asyncSchema = createAsyncSchema();
    const schemaRoutes = createRoutes<"/users/[id]">()({
      "/users/[id]": { params: { id: asyncSchema } },
    });

    expect(() => schemaRoutes.users.id.getRoute({ id: "test" })).toThrow(
      'Async validation is not supported for param "id"',
    );
  });

  it("works with multiple schemas", () => {
    const numberSchema = createMockSchema((v) => Number(v));
    const upperSchema = createMockSchema((v) => String(v).toUpperCase());
    const schemaRoutes = createRoutes<"/users/[id]/posts/[slug]">()({
      "/users/[id]/posts/[slug]": {
        params: {
          id: numberSchema,
          slug: upperSchema,
        },
      },
    });

    const route = schemaRoutes.users.id.posts.slug.getRoute({
      id: 123,
      slug: "hello",
    });
    expect(route).toBe("/users/123/posts/HELLO");
  });

  it("passes through params without schemas", () => {
    const numberSchema = createMockSchema((v) => Number(v));
    const schemaRoutes = createRoutes<"/users/[id]/posts/[slug]">()({
      "/users/[id]/posts/[slug]": { params: { id: numberSchema } },
    });

    const route = schemaRoutes.users.id.posts.slug.getRoute({
      id: 42,
      slug: "my-post",
    });
    expect(route).toBe("/users/42/posts/my-post");
  });
});

describe("param schema inheritance", () => {
  it("inherits param schema from parent route", () => {
    type Routes =
      | "/app/[locale]"
      | "/app/[locale]/dashboard"
      | "/app/[locale]/settings";

    const localeSchema = createMockSchema((v) => String(v).toUpperCase());

    const routes = createRoutes<Routes>()({
      "/app/[locale]": { params: { locale: localeSchema } },
      "/app/[locale]/dashboard": {},
      "/app/[locale]/settings": {},
    });

    // Child routes should inherit the locale schema
    const dashboardRoute = routes.app.locale.dashboard.getRoute({
      locale: "en",
    });
    expect(dashboardRoute).toBe("/app/EN/dashboard");

    const settingsRoute = routes.app.locale.settings.getRoute({
      locale: "de",
    });
    expect(settingsRoute).toBe("/app/DE/settings");
  });

  it("child route schema overrides parent schema", () => {
    type Routes = "/app/[locale]" | "/app/[locale]/admin";

    const parentSchema = createMockSchema((v) => String(v).toUpperCase());
    const childSchema = createMockSchema((v) => `override-${v}`);

    const routes = createRoutes<Routes>()({
      "/app/[locale]": { params: { locale: parentSchema } },
      "/app/[locale]/admin": { params: { locale: childSchema } },
    });

    // Parent uses its own schema
    const parentRoute = routes.app.locale.getRoute({ locale: "en" });
    expect(parentRoute).toBe("/app/EN");

    // Child uses its own schema (overrides parent)
    const childRoute = routes.app.locale.admin.getRoute({ locale: "en" });
    expect(childRoute).toBe("/app/override-en/admin");
  });

  it("inherits from multiple parent levels", () => {
    type Routes =
      | "/[locale]"
      | "/[locale]/app"
      | "/[locale]/app/[id]"
      | "/[locale]/app/[id]/edit";

    const localeSchema = createMockSchema((v) => String(v).toUpperCase());
    const idSchema = createMockSchema((v) => Number(v) * 10);

    const routes = createRoutes<Routes>()({
      "/[locale]": { params: { locale: localeSchema } },
      "/[locale]/app": {},
      "/[locale]/app/[id]": { params: { id: idSchema } },
      "/[locale]/app/[id]/edit": {},
    });

    // edit inherits both locale (from grandparent) and id (from parent)
    const editRoute = routes.locale.app.id.edit.getRoute({
      locale: "en",
      id: 5,
    });
    expect(editRoute).toBe("/EN/app/50/edit");
  });

  it("different branches have different schemas for same param name", () => {
    type Routes =
      | "/app/[locale]"
      | "/app/[locale]/dashboard"
      | "/landing/[locale]"
      | "/landing/[locale]/home";

    // app supports 3 languages (transforms to uppercase)
    const appLocaleSchema = createMockSchema((v) => String(v).toUpperCase());
    // landing only 2 (transforms to lowercase)
    const landingLocaleSchema = createMockSchema((v) =>
      String(v).toLowerCase(),
    );

    const routes = createRoutes<Routes>()({
      "/app/[locale]": { params: { locale: appLocaleSchema } },
      "/app/[locale]/dashboard": {},
      "/landing/[locale]": { params: { locale: landingLocaleSchema } },
      "/landing/[locale]/home": {},
    });

    // app branch uses app schema
    const dashboardRoute = routes.app.locale.dashboard.getRoute({
      locale: "En",
    });
    expect(dashboardRoute).toBe("/app/EN/dashboard");

    // landing branch uses landing schema
    const homeRoute = routes.landing.locale.home.getRoute({ locale: "En" });
    expect(homeRoute).toBe("/landing/en/home");
  });

  it("works when only some params are inherited", () => {
    type Routes = "/app/[locale]/users/[id]";

    const localeSchema = createMockSchema((v) => String(v).toUpperCase());

    const routes = createRoutes<Routes>()({
      // Only locale has a schema, id doesn't
      "/app/[locale]/users/[id]": {},
    });

    // No inheritance here since there's no parent route with schema
    const route = routes.app.locale.users.id.getRoute({
      locale: "en",
      id: "123",
    });
    expect(route).toBe("/app/en/users/123");
  });
});
