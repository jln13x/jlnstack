import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { createMigratableSchema } from "../src/migratable";
import type { Migration } from "../src/types";

function createMockSchema<T>(
  validate: (value: unknown) => T | null,
): StandardSchemaV1<unknown, T> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value) => {
        const result = validate(value);
        if (result === null) {
          return { issues: [{ message: "Validation failed" }] };
        }
        return { value: result };
      },
    },
  };
}

function createAsyncMockSchema<T>(
  validate: (value: unknown) => T | null,
): StandardSchemaV1<unknown, T> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: async (value) => {
        const result = validate(value);
        if (result === null) {
          return { issues: [{ message: "Validation failed" }] };
        }
        return { value: result };
      },
    },
  };
}

describe("createMigratableSchema", () => {
  it("validates against current schema when it matches", async () => {
    const currentSchema = createMockSchema((v) => {
      const obj = v as { name: string; age: number };
      if (typeof obj.name === "string" && typeof obj.age === "number") {
        return obj;
      }
      return null;
    });

    const schema = createMigratableSchema(currentSchema, []);

    const result = await schema["~standard"].validate({ name: "John", age: 30 });

    expect(result).toEqual({ value: { name: "John", age: 30 } });
  });

  it("returns validation error when no schema matches", async () => {
    const currentSchema = createMockSchema((v) => {
      const obj = v as { name: string; age: number };
      if (typeof obj.name === "string" && typeof obj.age === "number") {
        return obj;
      }
      return null;
    });

    const schema = createMigratableSchema(currentSchema, []);

    const result = await schema["~standard"].validate({ invalid: true });

    expect("issues" in result && result.issues?.length).toBeTruthy();
  });

  it("migrates from older schema format", async () => {
    type V1 = { name: string };
    type V2 = { name: string; age: number };

    const currentSchema = createMockSchema<V2>((v) => {
      const obj = v as V2;
      if (typeof obj.name === "string" && typeof obj.age === "number") {
        return obj;
      }
      return null;
    });

    const v1Schema = createMockSchema<V1>((v) => {
      const obj = v as V1;
      if (typeof obj.name === "string" && !("age" in obj)) {
        return obj;
      }
      return null;
    });

    const migration: Migration<V1, V2> = {
      from: v1Schema,
      migrate: (old) => ({ name: old.name, age: 0 }),
    };

    const schema = createMigratableSchema(currentSchema, [migration]);

    const result = await schema["~standard"].validate({ name: "John" });

    expect(result).toEqual({ value: { name: "John", age: 0 } });
  });

  it("tries migrations in order", async () => {
    type V1 = { name: string };
    type V2 = { name: string; age: number };
    type V3 = { name: string; age: number; email?: string };

    const currentSchema = createMockSchema<V3>((v) => {
      const obj = v as V3;
      if (
        typeof obj.name === "string" &&
        typeof obj.age === "number" &&
        "email" in obj
      ) {
        return obj;
      }
      return null;
    });

    const v1Schema = createMockSchema<V1>((v) => {
      const obj = v as Record<string, unknown>;
      if (
        typeof obj["name"] === "string" &&
        !("age" in obj) &&
        !("email" in obj)
      ) {
        return { name: obj["name"] as string };
      }
      return null;
    });

    const v2Schema = createMockSchema<V2>((v) => {
      const obj = v as Record<string, unknown>;
      if (
        typeof obj["name"] === "string" &&
        typeof obj["age"] === "number" &&
        !("email" in obj)
      ) {
        return { name: obj["name"] as string, age: obj["age"] as number };
      }
      return null;
    });

    const v1Migration: Migration<V1, V3> = {
      from: v1Schema,
      migrate: (old) => ({ name: old.name, age: 0, email: undefined }),
    };

    const v2Migration: Migration<V2, V3> = {
      from: v2Schema,
      migrate: (old) => ({ name: old.name, age: old.age, email: undefined }),
    };

    const schema = createMigratableSchema(currentSchema, [
      v1Migration,
      v2Migration,
    ]);

    // Test v1 data
    const v1Result = await schema["~standard"].validate({ name: "John" });
    expect(v1Result).toEqual({
      value: { name: "John", age: 0, email: undefined },
    });

    // Test v2 data
    const v2Result = await schema["~standard"].validate({
      name: "Jane",
      age: 25,
    });
    expect(v2Result).toEqual({
      value: { name: "Jane", age: 25, email: undefined },
    });
  });

  it("supports async migrations", async () => {
    type V1 = { name: string };
    type V2 = { name: string; displayName: string };

    const currentSchema = createMockSchema<V2>((v) => {
      const obj = v as V2;
      if (typeof obj.name === "string" && typeof obj.displayName === "string") {
        return obj;
      }
      return null;
    });

    const v1Schema = createMockSchema<V1>((v) => {
      const obj = v as V1;
      if (typeof obj.name === "string" && !("displayName" in obj)) {
        return obj;
      }
      return null;
    });

    const migration: Migration<V1, V2> = {
      from: v1Schema,
      migrate: async (old) => {
        // Simulate async operation (e.g., fetching display name)
        await new Promise((resolve) => setTimeout(resolve, 1));
        return { name: old.name, displayName: old.name.toUpperCase() };
      },
    };

    const schema = createMigratableSchema(currentSchema, [migration]);

    const result = await schema["~standard"].validate({ name: "john" });

    expect(result).toEqual({ value: { name: "john", displayName: "JOHN" } });
  });

  it("supports async schemas", async () => {
    type V1 = { name: string };
    type V2 = { name: string; age: number };

    const currentSchema = createAsyncMockSchema<V2>((v) => {
      const obj = v as V2;
      if (typeof obj.name === "string" && typeof obj.age === "number") {
        return obj;
      }
      return null;
    });

    const v1Schema = createAsyncMockSchema<V1>((v) => {
      const obj = v as V1;
      if (typeof obj.name === "string" && !("age" in obj)) {
        return obj;
      }
      return null;
    });

    const migration: Migration<V1, V2> = {
      from: v1Schema,
      migrate: (old) => ({ name: old.name, age: 0 }),
    };

    const schema = createMigratableSchema(currentSchema, [migration]);

    const result = await schema["~standard"].validate({ name: "John" });

    expect(result).toEqual({ value: { name: "John", age: 0 } });
  });

  it("uses first matching migration", async () => {
    type AmbiguousData = { value: string };
    type CurrentData = { value: string; source: string };

    const currentSchema = createMockSchema<CurrentData>((v) => {
      const obj = v as CurrentData;
      if (typeof obj.value === "string" && typeof obj.source === "string") {
        return obj;
      }
      return null;
    });

    // Both migrations could match the same data
    const migration1Schema = createMockSchema<AmbiguousData>((v) => {
      const obj = v as AmbiguousData;
      if (typeof obj.value === "string" && !("source" in obj)) {
        return obj;
      }
      return null;
    });

    const migration2Schema = createMockSchema<AmbiguousData>((v) => {
      const obj = v as AmbiguousData;
      if (typeof obj.value === "string" && !("source" in obj)) {
        return obj;
      }
      return null;
    });

    const migration1: Migration<AmbiguousData, CurrentData> = {
      from: migration1Schema,
      migrate: (old) => ({ value: old.value, source: "migration1" }),
    };

    const migration2: Migration<AmbiguousData, CurrentData> = {
      from: migration2Schema,
      migrate: (old) => ({ value: old.value, source: "migration2" }),
    };

    const schema = createMigratableSchema(currentSchema, [
      migration1,
      migration2,
    ]);

    const result = await schema["~standard"].validate({ value: "test" });

    // Should use first matching migration
    expect(result).toEqual({ value: { value: "test", source: "migration1" } });
  });

  it("has correct vendor in output schema", () => {
    const currentSchema = createMockSchema((v) => v);
    const schema = createMigratableSchema(currentSchema, []);

    expect(schema["~standard"].vendor).toBe("jlnstack/schema");
    expect(schema["~standard"].version).toBe(1);
  });
});
