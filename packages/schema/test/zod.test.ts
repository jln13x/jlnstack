import * as v from "valibot";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { createVersionedSchema } from "../src/versioned";
import { createVersionedZodSchema, toZod } from "../src/zod";

describe("toZod", () => {
  describe("sync vs async", () => {
    it("supports .parse() for sync schemas (no async migrations)", () => {
      const versionedSchema = createVersionedSchema({
        schema: z.object({ name: z.string() }),
      });

      const zodSchema = toZod(versionedSchema);

      // Sync validation works with .parse()
      const result = zodSchema.parse({ version: 1, data: { name: "John" } });
      expect(result).toEqual({ version: 1, data: { name: "John" } });
    });

    it("supports .parse() for sync migrations", () => {
      const versionedSchema = createVersionedSchema({
        schema: z.object({ name: z.string(), age: z.number() }),
        migrations: [
          {
            schema: z.object({ name: z.string() }),
            up: (v1) => ({ name: v1.name, age: 0 }), // sync migration
          },
        ],
      });

      const zodSchema = toZod(versionedSchema);

      // Sync migrations work with .parse()
      const result = zodSchema.parse({ version: 1, data: { name: "John" } });
      expect(result).toEqual({ version: 2, data: { name: "John", age: 0 } });
    });

    it("requires .parseAsync() for async migrations", () => {
      const versionedSchema = createVersionedSchema({
        schema: z.object({ name: z.string(), displayName: z.string() }),
        migrations: [
          {
            schema: z.object({ name: z.string() }),
            up: async (v1) => {
              // async migration
              await new Promise((resolve) => setTimeout(resolve, 1));
              return { name: v1.name, displayName: v1.name.toUpperCase() };
            },
          },
        ],
      });

      const zodSchema = toZod(versionedSchema);

      // Async migrations require .parseAsync(), .parse() throws
      expect(() =>
        zodSchema.parse({ version: 1, data: { name: "John" } }),
      ).toThrow();
    });

    it("async migrations work with .parseAsync()", async () => {
      const versionedSchema = createVersionedSchema({
        schema: z.object({ name: z.string(), displayName: z.string() }),
        migrations: [
          {
            schema: z.object({ name: z.string() }),
            up: async (v1) => {
              await new Promise((resolve) => setTimeout(resolve, 1));
              return { name: v1.name, displayName: v1.name.toUpperCase() };
            },
          },
        ],
      });

      const zodSchema = toZod(versionedSchema);

      const result = await zodSchema.parseAsync({
        version: 1,
        data: { name: "john" },
      });
      expect(result).toEqual({
        version: 2,
        data: { name: "john", displayName: "JOHN" },
      });
    });
  });

  it("converts a Standard Schema to Zod schema", async () => {
    const versionedSchema = createVersionedSchema({
      schema: z.object({ name: z.string(), age: z.number() }),
    });

    const zodSchema = toZod(versionedSchema);

    const result = await zodSchema.parseAsync({
      version: 1,
      data: { name: "John", age: 30 },
    });
    expect(result).toEqual({ version: 1, data: { name: "John", age: 30 } });
  });

  it("allows chaining Zod methods", async () => {
    const versionedSchema = createVersionedSchema({
      schema: z.object({ name: z.string(), age: z.number() }),
    });

    const zodSchema = toZod(versionedSchema)
      .refine((u) => u.data.age >= 18, "Must be 18+")
      .transform((u) => u.data);

    const result = await zodSchema.parseAsync({
      version: 1,
      data: { name: "John", age: 30 },
    });
    expect(result).toEqual({ name: "John", age: 30 });
  });

  it("fails validation with proper Zod error", async () => {
    const versionedSchema = createVersionedSchema({
      schema: z.object({ name: z.string(), age: z.number() }),
    });

    const zodSchema = toZod(versionedSchema);

    await expect(
      zodSchema.parseAsync({ version: 1, data: { name: "John" } }),
    ).rejects.toThrow();
  });

  it("works with migrations", async () => {
    const versionedSchema = createVersionedSchema({
      schema: z.object({ name: z.string(), age: z.number() }),
      migrations: [
        {
          schema: z.object({ name: z.string() }),
          up: (v1) => ({ name: v1.name, age: 0 }),
        },
      ],
    });

    const zodSchema = toZod(versionedSchema).transform((u) => u.data);

    const result = await zodSchema.parseAsync({
      version: 1,
      data: { name: "John" },
    });
    expect(result).toEqual({ name: "John", age: 0 });
  });

  it("works with allowUnversioned", async () => {
    const versionedSchema = createVersionedSchema({
      schema: z.object({ name: z.string() }),
      allowUnversioned: true,
    });

    const zodSchema = toZod(versionedSchema);

    const result = await zodSchema.parseAsync({ name: "John" });
    expect(result).toEqual({ version: 1, data: { name: "John" } });
  });

  describe("Standard Schema interop", () => {
    it("converts Valibot schema to Zod", async () => {
      const valibotSchema = v.object({
        name: v.string(),
        age: v.number(),
      });

      const zodSchema = toZod(valibotSchema);

      const result = await zodSchema.parseAsync({ name: "John", age: 30 });
      expect(result).toEqual({ name: "John", age: 30 });
    });

    it("allows chaining Zod methods on converted Valibot schema", async () => {
      const valibotSchema = v.object({
        name: v.string(),
        age: v.number(),
      });

      const zodSchema = toZod(valibotSchema)
        .refine((u) => u.age >= 18, "Must be 18+")
        .transform((u) => u.name.toUpperCase());

      const result = await zodSchema.parseAsync({ name: "John", age: 30 });
      expect(result).toBe("JOHN");
    });
  });
});

describe("createVersionedZodSchema", () => {
  it("creates a versioned Zod schema", async () => {
    const userSchema = createVersionedZodSchema({
      schema: z.object({ name: z.string(), age: z.number() }),
    });

    const result = await userSchema.parseAsync({
      version: 1,
      data: { name: "John", age: 30 },
    });
    expect(result).toEqual({ version: 1, data: { name: "John", age: 30 } });
  });

  it("supports migrations", async () => {
    const userSchema = createVersionedZodSchema({
      schema: z.object({ name: z.string(), age: z.number() }),
      migrations: [
        {
          schema: z.object({ name: z.string() }),
          up: (v1) => ({ name: (v1 as { name: string }).name, age: 0 }),
        },
      ],
    });

    const result = await userSchema.parseAsync({
      version: 1,
      data: { name: "John" },
    });
    expect(result).toEqual({ version: 2, data: { name: "John", age: 0 } });
  });

  it("supports allowUnversioned", async () => {
    const userSchema = createVersionedZodSchema({
      schema: z.object({ name: z.string() }),
      allowUnversioned: true,
    });

    const result = await userSchema.parseAsync({ name: "John" });
    expect(result).toEqual({ version: 1, data: { name: "John" } });
  });

  it("allows chaining Zod methods", async () => {
    const userSchema = createVersionedZodSchema({
      schema: z.object({ name: z.string(), age: z.number() }),
      migrations: [
        {
          schema: z.object({ name: z.string() }),
          up: (v1) => ({ name: (v1 as { name: string }).name, age: 0 }),
        },
      ],
      allowUnversioned: true,
    })
      .refine((u) => u.data.age >= 0, "Age must be non-negative")
      .transform((u) => u.data);

    const result = await userSchema.parseAsync({ name: "John" });
    expect(result).toEqual({ name: "John", age: 0 });
  });
});
