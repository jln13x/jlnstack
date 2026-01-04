import { and, eq, gte, like, lte } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { toWhere } from "../src/drizzle";
import {
  booleanFilter,
  createFilter,
  numberFilter,
  stringFilter,
} from "../src/index";

const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull(),
  createdAt: text("created_at").notNull(),
});

describe("toWhere", () => {
  const schema = {
    name: stringFilter({ operators: ["eq", "contains"] }),
    age: numberFilter({ operators: ["gte", "lte"] }),
    isActive: booleanFilter(),
  };

  it("should return undefined for empty filters", () => {
    const result = toWhere(schema, {}, {});
    expect(result).toBeUndefined();
  });

  it("should handle single filter with handler", () => {
    const result = toWhere(
      schema,
      { name: { operator: "eq", value: "john" } },
      { name: (v) => eq(users.name, v.value) },
    );
    expect(result).toBeDefined();
  });

  it("should handle contains with like", () => {
    const result = toWhere(
      schema,
      { name: { operator: "contains", value: "john" } },
      { name: (v) => like(users.name, `%${v.value}%`) },
    );
    expect(result).toBeDefined();
  });

  it("should handle filter without operator (boolean)", () => {
    const result = toWhere(
      schema,
      { isActive: true },
      { isActive: (v) => eq(users.isActive, v) },
    );
    expect(result).toBeDefined();
  });

  it("should combine multiple filters with AND", () => {
    const result = toWhere(
      schema,
      {
        name: { operator: "contains", value: "john" },
        age: { operator: "gte", value: 18 },
      },
      {
        name: (v) => like(users.name, `%${v.value}%`),
        age: (v) => gte(users.age, v.value),
      },
    );
    expect(result).toBeDefined();
  });

  it("should skip filters without handler", () => {
    const result = toWhere(
      schema,
      {
        name: { operator: "eq", value: "john" },
        age: { operator: "gte", value: 18 },
      },
      { name: (v) => eq(users.name, v.value) },
    );
    expect(result).toBeDefined();
  });
});

describe("toWhere with custom filter", () => {
  const dateRangeFilter = createFilter("dateRange")
    .input<{ from: string; to: string }>()
    .options()();

  const schema = {
    name: stringFilter({ operators: ["eq", "contains"] }),
    dateRange: dateRangeFilter,
  };

  it("should handle custom dateRange filter", () => {
    const result = toWhere(
      schema,
      { dateRange: { from: "2024-01-01", to: "2024-12-31" } },
      {
        dateRange: (v) =>
          and(gte(users.createdAt, v.from), lte(users.createdAt, v.to)),
      },
    );
    expect(result).toBeDefined();
  });

  it("should combine standard and custom filters", () => {
    const result = toWhere(
      schema,
      {
        name: { operator: "contains", value: "john" },
        dateRange: { from: "2024-01-01", to: "2024-12-31" },
      },
      {
        name: (v) => like(users.name, `%${v.value}%`),
        dateRange: (v) =>
          and(gte(users.createdAt, v.from), lte(users.createdAt, v.to)),
      },
    );
    expect(result).toBeDefined();
  });
});
