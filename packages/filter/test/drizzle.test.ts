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
import type { Group } from "../src/types";

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

  type Schema = typeof schema;

  it("should return undefined for empty filters", () => {
    const filter: Group<Schema> = {
      type: "group",
      id: "root",
      operator: "and",
      filters: [],
    };
    const result = toWhere(schema, filter, {});
    expect(result).toBeUndefined();
  });

  it("should handle single filter with handler", () => {
    const filter: Group<Schema> = {
      type: "group",
      id: "root",
      operator: "and",
      filters: [
        {
          type: "condition",
          id: "1",
          field: "name",
          value: { operator: "eq", value: "john" },
        },
      ],
    };
    const result = toWhere(schema, filter, {
      name: (v) => eq(users.name, v.value),
    });
    expect(result).toBeDefined();
  });

  it("should handle contains with like", () => {
    const filter: Group<Schema> = {
      type: "group",
      id: "root",
      operator: "and",
      filters: [
        {
          type: "condition",
          id: "1",
          field: "name",
          value: { operator: "contains", value: "john" },
        },
      ],
    };
    const result = toWhere(schema, filter, {
      name: (v) => like(users.name, `%${v.value}%`),
    });
    expect(result).toBeDefined();
  });

  it("should handle filter without operator (boolean)", () => {
    const filter: Group<Schema> = {
      type: "group",
      id: "root",
      operator: "and",
      filters: [{ type: "condition", id: "1", field: "isActive", value: true }],
    };
    const result = toWhere(schema, filter, {
      isActive: (v) => eq(users.isActive, v),
    });
    expect(result).toBeDefined();
  });

  it("should combine multiple filters with AND", () => {
    const filter: Group<Schema> = {
      type: "group",
      id: "root",
      operator: "and",
      filters: [
        {
          type: "condition",
          id: "1",
          field: "name",
          value: { operator: "contains", value: "john" },
        },
        {
          type: "condition",
          id: "2",
          field: "age",
          value: { operator: "gte", value: 18 },
        },
      ],
    };
    const result = toWhere(schema, filter, {
      name: (v) => like(users.name, `%${v.value}%`),
      age: (v) => gte(users.age, v.value),
    });
    expect(result).toBeDefined();
  });

  it("should skip filters without handler", () => {
    const filter: Group<Schema> = {
      type: "group",
      id: "root",
      operator: "and",
      filters: [
        {
          type: "condition",
          id: "1",
          field: "name",
          value: { operator: "eq", value: "john" },
        },
        {
          type: "condition",
          id: "2",
          field: "age",
          value: { operator: "gte", value: 18 },
        },
      ],
    };
    const result = toWhere(schema, filter, {
      name: (v) => eq(users.name, v.value),
    });
    expect(result).toBeDefined();
  });

  it("should handle nested groups with OR", () => {
    const filter: Group<Schema> = {
      type: "group",
      id: "root",
      operator: "or",
      filters: [
        { type: "condition", id: "1", field: "isActive", value: true },
        {
          type: "group",
          id: "nested",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "2",
              field: "name",
              value: { operator: "eq", value: "admin" },
            },
            {
              type: "condition",
              id: "3",
              field: "age",
              value: { operator: "gte", value: 21 },
            },
          ],
        },
      ],
    };
    const result = toWhere(schema, filter, {
      isActive: (v) => eq(users.isActive, v),
      name: (v) => eq(users.name, v.value),
      age: (v) => gte(users.age, v.value),
    });
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

  type Schema = typeof schema;

  it("should handle custom dateRange filter", () => {
    const filter: Group<Schema> = {
      type: "group",
      id: "root",
      operator: "and",
      filters: [
        {
          type: "condition",
          id: "1",
          field: "dateRange",
          value: { from: "2024-01-01", to: "2024-12-31" },
        },
      ],
    };
    const result = toWhere(schema, filter, {
      dateRange: (v) =>
        and(gte(users.createdAt, v.from), lte(users.createdAt, v.to)),
    });
    expect(result).toBeDefined();
  });

  it("should combine standard and custom filters", () => {
    const filter: Group<Schema> = {
      type: "group",
      id: "root",
      operator: "and",
      filters: [
        {
          type: "condition",
          id: "1",
          field: "name",
          value: { operator: "contains", value: "john" },
        },
        {
          type: "condition",
          id: "2",
          field: "dateRange",
          value: { from: "2024-01-01", to: "2024-12-31" },
        },
      ],
    };
    const result = toWhere(schema, filter, {
      name: (v) => like(users.name, `%${v.value}%`),
      dateRange: (v) =>
        and(gte(users.createdAt, v.from), lte(users.createdAt, v.to)),
    });
    expect(result).toBeDefined();
  });
});
