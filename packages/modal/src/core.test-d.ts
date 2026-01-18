import { describe, expectTypeOf, it } from "vitest";
import { modal, type StandardSchemaV1 } from "./core";
import type { TemplateContext, WithDefaults } from "./types";

const mockSchema = <T>(): StandardSchemaV1<T> =>
  ({}) as unknown as StandardSchemaV1<T>;

describe("modal builder types", () => {
  it("should infer input type from explicit generic", () => {
    const m = modal.input<{ title: string }>().create((input) => {
      expectTypeOf(input).toEqualTypeOf<{ title: string }>();
      return null;
    });

    expectTypeOf(m._def.component)
      .parameter(0)
      .toEqualTypeOf<{ title: string }>();
  });

  it("should infer input type from schema", () => {
    const schema = mockSchema<{ title: string }>();
    const m = modal.input(schema).create((input) => {
      expectTypeOf(input).toEqualTypeOf<{ title: string }>();
      return null;
    });

    expectTypeOf(m._def.component)
      .parameter(0)
      .toEqualTypeOf<{ title: string }>();
  });

  it("should infer output type from explicit generic", () => {
    const m = modal.output<boolean>().create((_input, { resolve }) => {
      expectTypeOf(resolve).parameter(0).toEqualTypeOf<boolean>();
      return null;
    });

    expectTypeOf(m._def.component)
      .parameter(1)
      .toHaveProperty("resolve")
      .parameter(0)
      .toEqualTypeOf<boolean>();
  });

  it("should infer output type from schema", () => {
    const schema = mockSchema<boolean>();
    const m = modal.output(schema).create((_input, { resolve }) => {
      expectTypeOf(resolve).parameter(0).toEqualTypeOf<boolean>();
      return null;
    });

    expectTypeOf(m._def.component)
      .parameter(1)
      .toHaveProperty("resolve")
      .parameter(0)
      .toEqualTypeOf<boolean>();
  });

  it("should infer input from component parameter when no input specified", () => {
    const m = modal.create((input: { name: string }) => {
      expectTypeOf(input).toEqualTypeOf<{ name: string }>();
      return null;
    });

    expectTypeOf(m._def.component)
      .parameter(0)
      .toEqualTypeOf<{ name: string }>();
  });

  it("should chain input and output", () => {
    const inputSchema = mockSchema<{ id: number }>();
    const outputSchema = mockSchema<string>();

    const m = modal
      .input(inputSchema)
      .output(outputSchema)
      .create((input, { resolve }) => {
        expectTypeOf(input).toEqualTypeOf<{ id: number }>();
        expectTypeOf(resolve).parameter(0).toEqualTypeOf<string>();
        return null;
      });

    expectTypeOf(m._def.component).parameter(0).toEqualTypeOf<{ id: number }>();
  });
});

describe("template types", () => {
  it("should pass template props to wrapper", () => {
    const templated = modal.template<{ className: string }>(
      ({ modal, props }) => {
        expectTypeOf(props).toEqualTypeOf<{ className: string }>();
        expectTypeOf(modal).toEqualTypeOf<unknown>();
        return null;
      },
    );

    templated.input<{ title: string }>().create((input) => {
      expectTypeOf(input).toEqualTypeOf<{ title: string }>();
      return null;
    });
  });

  it("should provide close and resolve in template context", () => {
    modal.template<{}>((ctx) => {
      expectTypeOf(ctx).toEqualTypeOf<TemplateContext<undefined, {}>>();
      expectTypeOf(ctx.close).toEqualTypeOf<() => void>();
      expectTypeOf(ctx.resolve).toEqualTypeOf<(value: undefined) => void>();
      return null;
    });
  });

  it("should chain template with input and output", () => {
    const m = modal
      .template<{ theme: string }>(() => null)
      .input<{ name: string }>()
      .output<boolean>()
      .create((input, { resolve }) => {
        expectTypeOf(input).toEqualTypeOf<{ name: string }>();
        expectTypeOf(resolve).parameter(0).toEqualTypeOf<boolean>();
        return null;
      });

    expectTypeOf(m._def.component)
      .parameter(0)
      .toEqualTypeOf<{ name: string }>();
  });
});

describe("WithDefaults type", () => {
  it("should make defaulted keys optional", () => {
    type Input = { title: string; message: string };
    type Defaults = { title: string };
    type Result = WithDefaults<Input, Defaults>;

    // Result should have message required and title optional
    const valid: Result = { message: "test" };
    const alsoValid: Result = { message: "test", title: "hi" };
    expectTypeOf(valid).toMatchTypeOf<Result>();
    expectTypeOf(alsoValid).toMatchTypeOf<Result>();
  });

  it("should handle empty defaults", () => {
    type Input = { title: string; message: string };
    type Defaults = Record<string, never>;
    type Result = WithDefaults<Input, Defaults>;

    // All keys should still be required
    const valid: Result = { title: "test", message: "test" };
    expectTypeOf(valid).toMatchTypeOf<Result>();
  });

  it("should handle all keys as defaults", () => {
    type Input = { title: string; message: string };
    type Defaults = { title: string; message: string };
    type Result = WithDefaults<Input, Defaults>;

    // All keys should be optional
    const valid: Result = {};
    const partial: Result = { title: "test" };
    expectTypeOf(valid).toMatchTypeOf<Result>();
    expectTypeOf(partial).toMatchTypeOf<Result>();
  });
});
