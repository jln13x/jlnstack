import { describe, expectTypeOf, it } from "vitest";
import { modal, type StandardSchemaV1 } from "./core";

const mockSchema = <T>(): StandardSchemaV1<T> =>
  ({}) as unknown as StandardSchemaV1<T>;

describe("modal builder types", () => {
  it("should infer input type from explicit generic", () => {
    const m = modal.input<{ title: string }>().create((input) => {
      expectTypeOf(input).toEqualTypeOf<{ title: string }>();
      return null;
    });

    expectTypeOf(m._def.component).parameter(0).toEqualTypeOf<{ title: string }>();
  });

  it("should infer input type from schema", () => {
    const schema = mockSchema<{ title: string }>();
    const m = modal.input(schema).create((input) => {
      expectTypeOf(input).toEqualTypeOf<{ title: string }>();
      return null;
    });

    expectTypeOf(m._def.component).parameter(0).toEqualTypeOf<{ title: string }>();
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

    expectTypeOf(m._def.component).parameter(0).toEqualTypeOf<{ name: string }>();
  });

  it("should chain input and output", () => {
    const inputSchema = mockSchema<{ id: number }>();
    const outputSchema = mockSchema<string>();

    const m = modal.input(inputSchema).output(outputSchema).create((input, { resolve }) => {
      expectTypeOf(input).toEqualTypeOf<{ id: number }>();
      expectTypeOf(resolve).parameter(0).toEqualTypeOf<string>();
      return null;
    });

    expectTypeOf(m._def.component).parameter(0).toEqualTypeOf<{ id: number }>();
  });
});
