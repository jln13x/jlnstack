import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { init } from "../src/core";

const createSchema = <T>(): StandardSchemaV1<T> =>
  ({
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value: unknown) => ({ value: value as T }),
    },
  }) as StandardSchemaV1<T>;

const factory = init({ ctx: () => ({ userId: "123" }) });

describe("init", () => {
  it("provides initial context", async () => {
    const fn = factory.procedure.run(({ ctx }) => ctx.userId);
    expect(await fn()).toBe("123");
  });
});

describe("use", () => {
  it("single middleware extends context", async () => {
    const fn = factory.procedure
      .use(({ next }) => next({ ctx: { role: "admin" } }))
      .run(({ ctx }) => ctx.role);

    expect(await fn()).toBe("admin");
  });

  it("array of middlewares merges contexts", async () => {
    const fn = factory.procedure
      .use([
        ({ next }) => next({ ctx: { a: 1 } }),
        ({ next }) => next({ ctx: { b: 2 } }),
      ])
      .run(({ ctx }) => ctx.a + ctx.b);

    expect(await fn()).toBe(3);
  });
});

describe("input", () => {
  it("passes input to run function", async () => {
    const schema = createSchema<{ x: number }>();
    const fn = factory.procedure.input(schema).run(({ input }) => input.x * 2);
    expect(await fn({ x: 5 })).toBe(10);
  });
});

describe("run", () => {
  it("returns the result", async () => {
    const fn = factory.procedure.run(() => "hello");
    expect(await fn()).toBe("hello");
  });
});
