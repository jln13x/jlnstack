import type { StandardSchemaV1 } from "@standard-schema/spec";
import { describe, expect, it } from "vitest";
import { createVersionedSchema } from "../src/versioned";
import type { VersionMigration } from "../src/types";

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

describe("createVersionedSchema", () => {
  describe("current version validation", () => {
    it("validates data at current version", async () => {
      const schema = createVersionedSchema({
        schema: createMockSchema((v) => {
          const obj = v as { name: string };
          if (typeof obj.name === "string") return obj;
          return null;
        }),
      });

      // No migrations = current version is 1
      const result = await schema["~standard"].validate({
        version: 1,
        data: { name: "John" },
      });

      expect(result).toEqual({
        value: { version: 1, data: { name: "John" } },
      });
    });

    it("returns error for invalid data at current version", async () => {
      const schema = createVersionedSchema({
        schema: createMockSchema((v) => {
          const obj = v as { name: string };
          if (typeof obj.name === "string") return obj;
          return null;
        }),
      });

      const result = await schema["~standard"].validate({
        version: 1,
        data: { invalid: true },
      });

      expect("issues" in result).toBe(true);
    });
  });

  describe("migration", () => {
    it("migrates from v1 to v2", async () => {
      type V1 = { name: string };
      type V2 = { name: string; age: number };

      const v1Schema = createMockSchema<V1>((v) => {
        const obj = v as V1;
        if (typeof obj.name === "string" && !("age" in obj)) return obj;
        return null;
      });

      const v2Schema = createMockSchema<V2>((v) => {
        const obj = v as V2;
        if (typeof obj.name === "string" && typeof obj.age === "number")
          return obj;
        return null;
      });

      const v1Migration: VersionMigration<V1> = {
        schema: v1Schema,
        up: (v1) => ({ name: v1.name, age: 0 }),
      };

      const schema = createVersionedSchema({
        schema: v2Schema,
        migrations: [v1Migration],
      });

      // migrations.length + 1 = 2
      const result = await schema["~standard"].validate({
        version: 1,
        data: { name: "John" },
      });

      expect(result).toEqual({
        value: { version: 2, data: { name: "John", age: 0 } },
      });
    });

    it("migrates through multiple versions (v1 -> v2 -> v3)", async () => {
      type V1 = { name: string };
      type V2 = { name: string; age: number };
      type V3 = { name: string; age: number; email?: string };

      const v1Schema = createMockSchema<V1>((v) => {
        const obj = v as V1 & { age?: unknown; email?: unknown };
        if (
          typeof obj.name === "string" &&
          !("age" in obj) &&
          !("email" in obj)
        )
          return { name: obj.name };
        return null;
      });

      const v2Schema = createMockSchema<V2>((v) => {
        const obj = v as V2 & { email?: unknown };
        if (
          typeof obj.name === "string" &&
          typeof obj.age === "number" &&
          !("email" in obj)
        )
          return { name: obj.name, age: obj.age };
        return null;
      });

      const v3Schema = createMockSchema<V3>((v) => {
        const obj = v as V3;
        if (
          typeof obj.name === "string" &&
          typeof obj.age === "number" &&
          "email" in obj
        )
          return obj;
        return null;
      });

      const v1Migration: VersionMigration<V1> = {
        schema: v1Schema,
        up: (v1) => ({ name: v1.name, age: 0 }),
      };

      const v2Migration: VersionMigration<V2> = {
        schema: v2Schema,
        up: (v2) => ({ name: v2.name, age: v2.age, email: undefined }),
      };

      const schema = createVersionedSchema({
        schema: v3Schema,
        migrations: [v1Migration, v2Migration],
      });

      // Test v1 -> v3 (current version = 3)
      const v1Result = await schema["~standard"].validate({
        version: 1,
        data: { name: "John" },
      });
      expect(v1Result).toEqual({
        value: {
          version: 3,
          data: { name: "John", age: 0, email: undefined },
        },
      });

      // Test v2 -> v3
      const v2Result = await schema["~standard"].validate({
        version: 2,
        data: { name: "Jane", age: 25 },
      });
      expect(v2Result).toEqual({
        value: {
          version: 3,
          data: { name: "Jane", age: 25, email: undefined },
        },
      });

      // Test v3 (no migration needed)
      const v3Result = await schema["~standard"].validate({
        version: 3,
        data: { name: "Bob", age: 30, email: "bob@example.com" },
      });
      expect(v3Result).toEqual({
        value: {
          version: 3,
          data: { name: "Bob", age: 30, email: "bob@example.com" },
        },
      });
    });

    it("supports async migrations", async () => {
      type V1 = { name: string };
      type V2 = { name: string; displayName: string };

      const v1Schema = createMockSchema<V1>((v) => {
        const obj = v as V1;
        if (typeof obj.name === "string" && !("displayName" in obj)) return obj;
        return null;
      });

      const v2Schema = createMockSchema<V2>((v) => {
        const obj = v as V2;
        if (typeof obj.name === "string" && typeof obj.displayName === "string")
          return obj;
        return null;
      });

      const v1Migration: VersionMigration<V1> = {
        schema: v1Schema,
        up: async (v1) => {
          await new Promise((resolve) => setTimeout(resolve, 1));
          return { name: v1.name, displayName: v1.name.toUpperCase() };
        },
      };

      const schema = createVersionedSchema({
        schema: v2Schema,
        migrations: [v1Migration],
      });

      const result = await schema["~standard"].validate({
        version: 1,
        data: { name: "john" },
      });

      expect(result).toEqual({
        value: { version: 2, data: { name: "john", displayName: "JOHN" } },
      });
    });
  });

  describe("unversioned data (allowUnversioned)", () => {
    it("handles unversioned data when allowUnversioned is true", async () => {
      type V1 = { name: string };
      type V2 = { name: string; age: number };

      const v1Schema = createMockSchema<V1>((v) => {
        const obj = v as V1;
        if (typeof obj.name === "string" && !("age" in obj)) return obj;
        return null;
      });

      const v2Schema = createMockSchema<V2>((v) => {
        const obj = v as V2;
        if (typeof obj.name === "string" && typeof obj.age === "number")
          return obj;
        return null;
      });

      const v1Migration: VersionMigration<V1> = {
        schema: v1Schema,
        up: (v1) => ({ name: v1.name, age: 0 }),
      };

      const schema = createVersionedSchema({
        schema: v2Schema,
        migrations: [v1Migration],
        allowUnversioned: true,
      });

      // Unversioned input (no wrapper) - treated as v1
      const result = await schema["~standard"].validate({ name: "John" });

      expect(result).toEqual({
        value: { version: 2, data: { name: "John", age: 0 } },
      });
    });

    it("handles unversioned data at current version", async () => {
      const schema = createVersionedSchema({
        schema: createMockSchema((v) => {
          const obj = v as { name: string };
          if (typeof obj.name === "string") return obj;
          return null;
        }),
        allowUnversioned: true,
      });

      // Unversioned input treated as v1 (current version when no migrations)
      const result = await schema["~standard"].validate({ name: "John" });

      expect(result).toEqual({
        value: { version: 1, data: { name: "John" } },
      });
    });

    it("returns error for unversioned data when allowUnversioned is not set", async () => {
      const schema = createVersionedSchema({
        schema: createMockSchema((v) => {
          const obj = v as { name: string };
          if (typeof obj.name === "string") return obj;
          return null;
        }),
      });

      const result = await schema["~standard"].validate({ name: "John" });

      expect("issues" in result).toBe(true);
      if ("issues" in result && result.issues) {
        expect(result.issues[0]?.message).toContain("Invalid input");
      }
    });
  });

  describe("error handling", () => {
    it("returns error for unknown version", async () => {
      const v1Migration: VersionMigration = {
        schema: createMockSchema((v) => v),
        up: (v) => v,
      };

      const schema = createVersionedSchema({
        schema: createMockSchema((v) => v),
        migrations: [v1Migration],
      });

      // Current version is 2, so version 99 is invalid
      const result = await schema["~standard"].validate({
        version: 99,
        data: { name: "John" },
      });

      expect("issues" in result).toBe(true);
      if ("issues" in result && result.issues) {
        expect(result.issues[0]?.message).toContain("Unknown version: 99");
      }
    });

    it("returns error when migration produces invalid data", async () => {
      type V1 = { name: string };
      type V2 = { name: string; age: number };

      const v1Schema = createMockSchema<V1>((v) => {
        const obj = v as V1;
        if (typeof obj.name === "string") return obj;
        return null;
      });

      const v2Schema = createMockSchema<V2>((v) => {
        const obj = v as V2;
        if (typeof obj.name === "string" && typeof obj.age === "number")
          return obj;
        return null;
      });

      const v1Migration: VersionMigration<V1> = {
        schema: v1Schema,
        // Intentionally wrong migration - doesn't add age
        up: (v1) => ({ name: v1.name }),
      };

      const schema = createVersionedSchema({
        schema: v2Schema,
        migrations: [v1Migration],
      });

      const result = await schema["~standard"].validate({
        version: 1,
        data: { name: "John" },
      });

      expect("issues" in result).toBe(true);
      if ("issues" in result && result.issues) {
        expect(result.issues[0]?.message).toContain(
          "Migration produced invalid data",
        );
      }
    });

    it("returns error when initial validation fails", async () => {
      type V1 = { name: string };
      type V2 = { name: string; age: number };

      const v1Schema = createMockSchema<V1>((v) => {
        const obj = v as V1;
        if (typeof obj.name === "string") return obj;
        return null;
      });

      const v2Schema = createMockSchema<V2>((v) => {
        const obj = v as V2;
        if (typeof obj.name === "string" && typeof obj.age === "number")
          return obj;
        return null;
      });

      const v1Migration: VersionMigration<V1> = {
        schema: v1Schema,
        up: (v1) => ({ name: v1.name, age: 0 }),
      };

      const schema = createVersionedSchema({
        schema: v2Schema,
        migrations: [v1Migration],
      });

      // Data doesn't match v1 schema
      const result = await schema["~standard"].validate({
        version: 1,
        data: { invalid: true },
      });

      expect("issues" in result).toBe(true);
    });
  });

  describe("schema metadata", () => {
    it("has correct vendor and version", () => {
      const schema = createVersionedSchema({
        schema: createMockSchema((v) => v),
      });

      expect(schema["~standard"].vendor).toBe("jlnstack/schema");
      expect(schema["~standard"].version).toBe(1);
    });
  });
});
