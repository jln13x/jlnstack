import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { init } from "../src/next";

const createSchema = <T>(): StandardSchemaV1<T> =>
  ({
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value: unknown) => ({ value: value as T }),
    },
  }) as StandardSchemaV1<T>;

const createFailingSchema = <T>(): StandardSchemaV1<T> =>
  ({
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => ({ issues: [{ message: "Invalid" }] }),
    },
  }) as StandardSchemaV1<T>;

const factory = init({ ctx: () => ({ userId: "123" }) });

describe("init", () => {
  it("provides initial context", async () => {
    const fn = factory.procedure.run(({ ctx }) => ctx.userId);
    expect(await (fn as () => Promise<string>)()).toBe("123");
  });

  it("returns middleware factory", () => {
    const mw = factory.middleware(({ next }) =>
      next({ ctx: { role: "admin" } }),
    );
    expect(typeof mw).toBe("function");
  });
});

describe("params", () => {
  it("unwraps params promise and adds to context", async () => {
    const fn = factory.procedure
      .params<{ slug: string }>()
      .run(({ ctx }) => ctx.params.slug);

    const result = await fn({ params: Promise.resolve({ slug: "hello" }) });
    expect(result).toBe("hello");
  });

  it("works with schema validation", async () => {
    const schema = createSchema<{ id: string }>();
    const fn = factory.procedure
      .params<{ id: string }, typeof schema>(schema)
      .run(({ ctx }) => ctx.params.id);

    const result = await fn({ params: Promise.resolve({ id: "42" }) });
    expect(result).toBe("42");
  });
});

describe("searchParams", () => {
  it("validates and adds searchParams to context", async () => {
    const schema = createSchema<{ page: string }>();
    const fn = factory.procedure
      .searchParams(schema)
      .run(({ ctx }) => ctx.searchParams.page);

    const result = await fn({ searchParams: Promise.resolve({ page: "1" }) });
    expect(result).toBe("1");
  });

  it("throws on invalid searchParams", async () => {
    const schema = createFailingSchema<{ page: string }>();
    const fn = factory.procedure
      .searchParams(schema)
      .run(({ ctx }) => ctx.searchParams.page);

    await expect(
      fn({ searchParams: Promise.resolve({ page: "1" }) }),
    ).rejects.toThrow("Invalid search params");
  });
});

describe("page", () => {
  it("is an alias for run", async () => {
    const fn = factory.procedure.page(({ ctx }) => `user-${ctx.userId}`);
    const result = await fn({
      searchParams: Promise.resolve({}),
      params: Promise.resolve({}),
    });
    expect(result).toBe("user-123");
  });

  it("works with params and searchParams", async () => {
    const paramsSchema = createSchema<{ slug: string }>();
    const searchSchema = createSchema<{ q: string }>();

    const fn = factory.procedure
      .params<{ slug: string }, typeof paramsSchema>(paramsSchema)
      .searchParams(searchSchema)
      .page(({ ctx }) => `${ctx.params.slug}-${ctx.searchParams.q}`);

    const result = await fn({
      params: Promise.resolve({ slug: "post" }),
      searchParams: Promise.resolve({ q: "test" }),
    });
    expect(result).toBe("post-test");
  });
});

describe("rsc", () => {
  it("executes and returns value", async () => {
    const fn = factory.procedure.rsc(() => "RSC Content");
    expect(await (fn as () => Promise<string>)()).toBe("RSC Content");
  });
});

describe("metadata", () => {
  it("returns Metadata object", async () => {
    const fn = factory.procedure.metadata(() => ({ title: "My Page" }));
    expect(await (fn as () => Promise<{ title: string }>)()).toEqual({
      title: "My Page",
    });
  });

  it("can access context for dynamic metadata", async () => {
    const fn = factory.procedure.metadata(({ ctx }) => ({
      title: `User ${ctx.userId}`,
    }));
    expect(await (fn as () => Promise<{ title: string }>)()).toEqual({
      title: "User 123",
    });
  });
});

describe("layout", () => {
  it("receives children in input", async () => {
    const fn = factory.procedure.layout(
      ({ input }) => `wrapped: ${input.children}`,
    );

    const result = await fn({ children: "Content" });
    expect(result).toBe("wrapped: Content");
  });
});

describe("layoutMetadata", () => {
  it("returns Metadata for layouts", async () => {
    const fn = factory.procedure.layoutMetadata(() => ({
      description: "Layout desc",
    }));
    expect(await (fn as () => Promise<{ description: string }>)()).toEqual({
      description: "Layout desc",
    });
  });
});

describe("staticParams", () => {
  it("returns array of params for static generation", async () => {
    const fn = factory.procedure
      .params<{ slug: string }>()
      .staticParams(() => [{ slug: "post-1" }, { slug: "post-2" }]);

    const result = await fn({ params: Promise.resolve({ slug: "" }) });
    expect(result).toEqual([{ slug: "post-1" }, { slug: "post-2" }]);
  });
});

describe("chaining", () => {
  it("chains params with middleware", async () => {
    const authMiddleware = factory.middleware(({ ctx, next }) =>
      next({ ctx: { ...ctx, isAuth: true } }),
    );

    const fn = factory.procedure
      .use(authMiddleware)
      .params<{ id: string }>()
      .page(({ ctx }) => `${ctx.isAuth}-${ctx.params.id}`);

    const result = await fn({
      params: Promise.resolve({ id: "42" }),
      searchParams: Promise.resolve({}),
    });
    expect(result).toBe("true-42");
  });

  it("chains multiple middlewares with next-specific methods", async () => {
    const mw1 = factory.middleware(({ next }) => next({ ctx: { a: 1 } }));
    const mw2 = factory.middleware(({ next }) => next({ ctx: { b: 2 } }));

    const fn = factory.procedure
      .use([mw1, mw2])
      .params<{ slug: string }>()
      .searchParams(createSchema<{ q: string }>())
      .page(({ ctx }) => ctx.a + ctx.b);

    const result = await (fn as any)({
      params: Promise.resolve({ slug: "test" }),
      searchParams: Promise.resolve({ q: "query" }),
    });
    expect(result).toBe(3);
  });

  it("preserves context through entire chain", async () => {
    const fn = factory.procedure
      .use(({ next }) => next({ ctx: { step1: true } }))
      .use(({ ctx, next }) => next({ ctx: { ...ctx, step2: true } }))
      .params<{ id: string }>()
      .page(({ ctx }) => `${ctx.step1}-${ctx.step2}-${ctx.params.id}`);

    const result = await fn({
      params: Promise.resolve({ id: "test" }),
      searchParams: Promise.resolve({}),
    });
    expect(result).toBe("true-true-test");
  });
});

describe("async context", () => {
  it("handles async initial context", async () => {
    const asyncFactory = init({
      ctx: async () => {
        await Promise.resolve();
        return { asyncValue: "loaded" };
      },
    });

    const fn = asyncFactory.procedure.run(({ ctx }) => ctx.asyncValue);
    expect(await (fn as () => Promise<string>)()).toBe("loaded");
  });
});
