import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { expectTypeOf, test } from "vitest";
import { init } from "../src/next";

const createSchema = <T>(): StandardSchemaV1<T> =>
  ({
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => ({ value: {} as T }),
    },
  }) as StandardSchemaV1<T>;

const factory = init({ ctx: () => ({ userId: "123" }) });

test("init - context propagates to procedure", () => {
  factory.procedure.run(({ ctx }) => {
    expectTypeOf(ctx).toEqualTypeOf<{ userId: string }>();
  });
});

test("params - adds params to context without schema", () => {
  factory.procedure.params<{ slug: string }>().run(({ ctx, input }) => {
    expectTypeOf(ctx).toExtend<{ userId: string; params: { slug: string } }>();
    return input;
  });
});

test("params - adds params to context with schema", () => {
  const schema = createSchema<{ id: number }>();

  factory.procedure
    .params<{ id: number }, typeof schema>(schema)
    .run(({ ctx }) => {
      expectTypeOf(ctx).toExtend<{ userId: string; params: { id: number } }>();
    });
});

test("params - input requires Promise<params>", () => {
  const fn = factory.procedure
    .params<{ slug: string }>()
    .run(({ ctx }) => ctx.params.slug);

  expectTypeOf(fn).toEqualTypeOf<
    (input: { params: Promise<{ slug: string }> }) => Promise<string>
  >();
});

test("searchParams - adds validated searchParams to context", () => {
  const schema = createSchema<{ page: number; limit: number }>();

  factory.procedure.searchParams(schema).run(({ ctx, input }) => {
    expectTypeOf(ctx).toExtend<{
      userId: string;
      searchParams: { page: number; limit: number };
    }>();
    return input;
  });
});

test("searchParams - input requires Promise<Record<string, ...>>", () => {
  const schema = createSchema<{ q: string }>();
  const fn = factory.procedure
    .searchParams(schema)
    .run(({ ctx }) => ctx.searchParams.q);

  expectTypeOf(fn).toEqualTypeOf<
    (input: {
      searchParams: Promise<Record<string, string | string[] | undefined>>;
    }) => Promise<string>
  >();
});

test("page - returns ReactNode and accepts page props", () => {
  const fn = factory.procedure.page(() => null as ReactNode);

  expectTypeOf(fn).toBeFunction();
});

test("page - context available in page handler", () => {
  factory.procedure.page(({ ctx }) => {
    expectTypeOf(ctx).toEqualTypeOf<{ userId: string }>();
    return null;
  });
});

test("rsc - returns ReactNode", () => {
  const fn = factory.procedure.rsc(() => null as ReactNode);

  expectTypeOf(fn).toBeFunction();
});

test("metadata - returns Metadata type", () => {
  const fn = factory.procedure.metadata(() => ({ title: "Test" }));

  expectTypeOf(fn).toBeFunction();
  expectTypeOf(fn).returns.resolves.toExtend<Metadata>();
});

test("layout - receives children in input", () => {
  factory.procedure.layout(({ input }) => {
    expectTypeOf(input).toEqualTypeOf<{ children: ReactNode }>();
    return null;
  });
});

test("layout - function signature", () => {
  const fn = factory.procedure.layout(() => null as ReactNode);

  expectTypeOf(fn).toBeFunction();
});

test("layoutMetadata - excludes searchParams from context", () => {
  const searchSchema = createSchema<{ q: string }>();

  factory.procedure.searchParams(searchSchema).layoutMetadata(({ ctx }) => {
    expectTypeOf(ctx).toEqualTypeOf<{ userId: string }>();
    return { title: "Layout" };
  });
});

test("staticParams - returns array of params", () => {
  const fn = factory.procedure
    .params<{ slug: string }>()
    .staticParams(() => [{ slug: "a" }, { slug: "b" }]);

  type ParamsArray = { slug: string }[];
  expectTypeOf(fn).returns.resolves.toEqualTypeOf<ParamsArray>();
});

test("chaining params and searchParams", () => {
  const paramsSchema = createSchema<{ id: string }>();
  const searchSchema = createSchema<{ tab: string }>();

  factory.procedure
    .params<{ id: string }, typeof paramsSchema>(paramsSchema)
    .searchParams(searchSchema)
    .page(({ ctx }) => {
      expectTypeOf(ctx).toExtend<{
        userId: string;
        params: { id: string };
        searchParams: { tab: string };
      }>();
      return null;
    });
});

test("middleware preserves input requirements through chain", () => {
  const mw = factory.middleware(({ next }) =>
    next({ ctx: { role: "admin" as const } }),
  );

  factory.procedure
    .use(mw)
    .params<{ slug: string }>()
    .page(({ ctx }) => {
      expectTypeOf(ctx).toExtend<{ role: "admin"; params: { slug: string } }>();
      return null;
    });
});

test("middleware chain - function signature with middleware and params", () => {
  const mw = factory.middleware(({ next }) =>
    next({ ctx: { role: "admin" as const } }),
  );

  const fn = factory.procedure
    .use(mw)
    .params<{ slug: string }>()
    .run(({ ctx }) => ctx.params.slug);

  expectTypeOf(fn).toEqualTypeOf<
    (input: { params: Promise<{ slug: string }> }) => Promise<string>
  >();
});
