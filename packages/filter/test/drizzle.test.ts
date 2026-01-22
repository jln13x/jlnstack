import { and, eq, gte, lte } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import { createWhereBuilder } from "../src/drizzle";
import {
  booleanFilter,
  createFilter,
  dateFilter,
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

describe("createWhereBuilder", () => {
  describe("with only built-in filters", () => {
    const schema = {
      name: stringFilter(),
      age: numberFilter(),
      isActive: booleanFilter(),
      createdAt: dateFilter(),
    };

    type Schema = typeof schema;

    const toWhere = createWhereBuilder(schema, {
      name: users.name,
      age: users.age,
      isActive: users.isActive,
      createdAt: users.createdAt,
    });

    it("should return undefined for empty filters", () => {
      const filter: Group<Schema> = {
        type: "group",
        id: "root",
        operator: "and",
        filters: [],
      };
      const result = toWhere(filter);
      expect(result).toBeUndefined();
    });

    it("should handle built-in filters without handlers", () => {
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
      const result = toWhere(filter);
      expect(result).toBeDefined();
    });

    it("should handle multiple built-in filters", () => {
      const filter: Group<Schema> = {
        type: "group",
        id: "root",
        operator: "and",
        filters: [
          {
            type: "condition",
            id: "1",
            field: "name",
            value: { operator: "startsWith", value: "john" },
          },
          {
            type: "condition",
            id: "2",
            field: "age",
            value: { operator: "gte", value: 18 },
          },
          {
            type: "condition",
            id: "3",
            field: "isActive",
            value: true,
          },
        ],
      };
      const result = toWhere(filter);
      expect(result).toBeDefined();
    });

    it("should handle nested groups", () => {
      const filter: Group<Schema> = {
        type: "group",
        id: "root",
        operator: "or",
        filters: [
          {
            type: "condition",
            id: "1",
            field: "isActive",
            value: true,
          },
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
      const result = toWhere(filter);
      expect(result).toBeDefined();
    });

    describe("string filter operators", () => {
      it("should handle eq operator", () => {
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
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle neq operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "name",
              value: { operator: "neq", value: "john" },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle contains operator", () => {
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
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle startsWith operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "name",
              value: { operator: "startsWith", value: "john" },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle endsWith operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "name",
              value: { operator: "endsWith", value: "john" },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });
    });

    describe("number filter operators", () => {
      it("should handle eq operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "age",
              value: { operator: "eq", value: 25 },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle neq operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "age",
              value: { operator: "neq", value: 25 },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle gt operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "age",
              value: { operator: "gt", value: 18 },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle gte operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "age",
              value: { operator: "gte", value: 18 },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle lt operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "age",
              value: { operator: "lt", value: 65 },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle lte operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "age",
              value: { operator: "lte", value: 65 },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });
    });

    describe("boolean filter", () => {
      it("should handle true value", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            { type: "condition", id: "1", field: "isActive", value: true },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle false value", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            { type: "condition", id: "1", field: "isActive", value: false },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });
    });

    describe("date filter operators", () => {
      it("should handle eq operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "createdAt",
              value: { operator: "eq", value: "2024-01-01" },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle gte operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "createdAt",
              value: { operator: "gte", value: "2024-01-01" },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });

      it("should handle lte operator", () => {
        const filter: Group<Schema> = {
          type: "group",
          id: "root",
          operator: "and",
          filters: [
            {
              type: "condition",
              id: "1",
              field: "createdAt",
              value: { operator: "lte", value: "2024-12-31" },
            },
          ],
        };
        const result = toWhere(filter);
        expect(result).toBeDefined();
      });
    });
  });

  describe("with custom filters", () => {
    const dateRangeFilter = createFilter("dateRange")
      .input<{ from: string; to: string }>()
      .options()();

    const schema = {
      name: stringFilter(),
      age: numberFilter(),
      dateRange: dateRangeFilter,
    };

    type Schema = typeof schema;

    const toWhere = createWhereBuilder(schema, {
      name: users.name,
      age: users.age,
    });

    it("should require handlers only for custom filters", () => {
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
          {
            type: "condition",
            id: "3",
            field: "dateRange",
            value: { from: "2024-01-01", to: "2024-12-31" },
          },
        ],
      };

      const result = toWhere(filter, {
        handlers: {
          dateRange: (v) =>
            and(gte(users.createdAt, v.from), lte(users.createdAt, v.to)),
        },
      });
      expect(result).toBeDefined();
    });

    it("should allow overriding built-in filters via handlers", () => {
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

      const result = toWhere(filter, {
        handlers: {
          name: (v) => eq(users.name, v.value),
          dateRange: (v) =>
            and(gte(users.createdAt, v.from), lte(users.createdAt, v.to)),
        },
      });
      expect(result).toBeDefined();
    });
  });
});
