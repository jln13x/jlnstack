import type { StandardSchemaV1 } from "@standard-schema/spec";
import { expectTypeOf, test } from "vitest";
import { init } from "../src/core";
import type { Middleware } from "../src/core-internal";

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

test("use - single middleware updates context", () => {
  const mw: Middleware<
    unknown,
    { userId: string },
    { role: "admin" | "user" }
  > = ({ next }) => next({ ctx: { role: "admin" } });

  factory.procedure.use(mw).run(({ ctx }) => {
    expectTypeOf(ctx).toEqualTypeOf<{ role: "admin" | "user" }>();
  });
});

test("use - array of middlewares merges contexts", () => {
  const mw1: Middleware<unknown, { userId: string }, { a: number }> = ({
    next,
  }) => next({ ctx: { a: 1 } });
  const mw2: Middleware<unknown, { userId: string }, { b: string }> = ({
    next,
  }) => next({ ctx: { b: "hello" } });

  factory.procedure.use([mw1, mw2]).run(({ ctx }) => {
    expectTypeOf(ctx).toEqualTypeOf<{ a: number; b: string }>();
  });
});

test("input - schema type added to input", () => {
  const schema = createSchema<{ name: string }>();

  factory.procedure.input(schema).run(({ input }) => {
    expectTypeOf(input).toEqualTypeOf<{ name: string }>();
  });
});

test("run - without input returns no-arg function", () => {
  const fn = factory.procedure.run(() => "result");
  expectTypeOf(fn).toEqualTypeOf<() => Promise<string>>();
});

test("run - with input returns function with arg", () => {
  const schema = createSchema<{ id: number }>();
  const fn = factory.procedure.input(schema).run(({ input }) => input.id);
  expectTypeOf(fn).toEqualTypeOf<(input: { id: number }) => Promise<number>>();
});

test("run - with partial input returns function with optional arg", () => {
  const schema = createSchema<{ id?: number }>();
  const fn = factory.procedure.input(schema).run(() => "result");
  expectTypeOf(fn).toEqualTypeOf<
    (input?: { id?: number }) => Promise<string>
  >();
});

test("middleware factory - preserves types", () => {
  const mw = factory.middleware(({ ctx, input, next }) => {
    expectTypeOf(ctx).toEqualTypeOf<{ userId: string }>();
    expectTypeOf(input).toEqualTypeOf<unknown>();
    return next({ ctx: { role: "admin" as const } });
  });

  expectTypeOf(mw).toEqualTypeOf<
    Middleware<unknown, { userId: string }, { role: "admin" }>
  >();

  factory.procedure.use(mw).run(({ ctx }) => {
    expectTypeOf(ctx).toEqualTypeOf<{ role: "admin" }>();
  });
});
