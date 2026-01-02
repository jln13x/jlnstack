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

describe("createRoutes with schemas", () => {
  it("validates and transforms params using schema", () => {
    const numberSchema = createMockSchema((v) => Number(v));
    const schemaRoutes = createRoutes({
      "/users/[id]": { id: numberSchema },
    });

    const route = schemaRoutes.users.id.getRoute({ id: 42 });
    expect(route).toBe("/users/42");
  });

  it("transforms string to number via schema", () => {
    const numberSchema = createMockSchema((v) => Number(v) * 2);
    const schemaRoutes = createRoutes({
      "/users/[id]": { id: numberSchema },
    });

    const route = schemaRoutes.users.id.getRoute({ id: 5 });
    expect(route).toBe("/users/10");
  });

  it("throws on validation failure", () => {
    const failingSchema = createFailingSchema("Invalid id");
    const schemaRoutes = createRoutes({
      "/users/[id]": { id: failingSchema },
    });

    expect(() => schemaRoutes.users.id.getRoute({ id: "bad" })).toThrow(
      'Validation failed for param "id": Invalid id',
    );
  });

  it("throws on async validation", () => {
    const asyncSchema = createAsyncSchema();
    const schemaRoutes = createRoutes({
      "/users/[id]": { id: asyncSchema },
    });

    expect(() => schemaRoutes.users.id.getRoute({ id: "test" })).toThrow(
      'Async validation is not supported for param "id"',
    );
  });

  it("works with multiple schemas", () => {
    const numberSchema = createMockSchema((v) => Number(v));
    const upperSchema = createMockSchema((v) => String(v).toUpperCase());
    const schemaRoutes = createRoutes({
      "/users/[id]/posts/[slug]": {
        id: numberSchema,
        slug: upperSchema,
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
    const schemaRoutes = createRoutes({
      "/users/[id]/posts/[slug]": { id: numberSchema },
    });

    const route = schemaRoutes.users.id.posts.slug.getRoute({
      id: 42,
      slug: "my-post",
    });
    expect(route).toBe("/users/42/posts/my-post");
  });
});
