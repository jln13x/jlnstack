import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expectTypeOf, it } from "vitest";
import { createMigratableSchema } from "../src/migratable";
import type { Migration } from "../src/types";

describe("type inference", () => {
  it("createMigratableSchema returns StandardSchemaV1 with correct output type", () => {
    type User = { name: string; age: number };

    const currentSchema: StandardSchemaV1<unknown, User> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (v) => ({ value: v as User }),
      },
    };

    const schema = createMigratableSchema(currentSchema, []);

    expectTypeOf(schema).toMatchTypeOf<StandardSchemaV1<unknown, User>>();
  });

  it("migration migrate function receives correct input type", () => {
    type V1 = { name: string };
    type V2 = { name: string; age: number };

    const v1Schema: StandardSchemaV1<unknown, V1> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (v) => ({ value: v as V1 }),
      },
    };

    const migration: Migration<V1, V2> = {
      from: v1Schema,
      migrate: (old) => {
        expectTypeOf(old).toEqualTypeOf<V1>();
        return { name: old.name, age: 0 };
      },
    };

    expectTypeOf(migration.migrate).returns.toMatchTypeOf<V2 | Promise<V2>>();
  });

  it("migration array enforces correct output type", () => {
    type V1 = { name: string };
    type V2 = { name: string; age: number };
    type V3 = { name: string; age: number; email?: string };

    const currentSchema: StandardSchemaV1<unknown, V3> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (v) => ({ value: v as V3 }),
      },
    };

    const v1Schema: StandardSchemaV1<unknown, V1> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (v) => ({ value: v as V1 }),
      },
    };

    const v2Schema: StandardSchemaV1<unknown, V2> = {
      "~standard": {
        version: 1,
        vendor: "test",
        validate: (v) => ({ value: v as V2 }),
      },
    };

    const v1Migration: Migration<V1, V3> = {
      from: v1Schema,
      migrate: (old) => ({ name: old.name, age: 0, email: undefined }),
    };

    const v2Migration: Migration<V2, V3> = {
      from: v2Schema,
      migrate: (old) => ({ name: old.name, age: old.age, email: undefined }),
    };

    // This should type-check because migrations return V3
    createMigratableSchema(currentSchema, [v1Migration, v2Migration]);
  });
});
