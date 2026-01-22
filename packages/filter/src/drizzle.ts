import type { Column } from "drizzle-orm";
import { and, eq, gt, gte, like, lt, lte, ne, or, type SQL } from "drizzle-orm";
import type { DateValue } from "./built-in/date-filter";
import type { NumberValue } from "./built-in/number-filter";
import type { StringValue } from "./built-in/string-filter";
import type {
  AnyFilterDef,
  FilterSchemaConstraint,
  FilterValue,
} from "./index";
import type { FilterExpression, Group } from "./types";
import { isGroup } from "./types";

const BUILT_IN_FILTER_IDS = ["string", "number", "date", "boolean"] as const;
type BuiltInFilterId = (typeof BUILT_IN_FILTER_IDS)[number];

function isBuiltInFilter(filterDef: AnyFilterDef): boolean {
  return BUILT_IN_FILTER_IDS.includes(filterDef.id as BuiltInFilterId);
}

type FilterHandler<V> = (value: V) => SQL | undefined;

type BuiltInFilterKeys<Schema extends FilterSchemaConstraint> = {
  [K in keyof Schema]: Schema[K]["id"] extends BuiltInFilterId ? K : never;
}[keyof Schema];

type CustomFilterKeys<Schema extends FilterSchemaConstraint> = {
  [K in keyof Schema]: Schema[K]["id"] extends BuiltInFilterId ? never : K;
}[keyof Schema];

type ColumnMapping<Schema extends FilterSchemaConstraint> = {
  [K in BuiltInFilterKeys<Schema>]: Column;
};

type CustomHandlers<Schema extends FilterSchemaConstraint> = {
  [K in CustomFilterKeys<Schema>]: FilterHandler<FilterValue<Schema[K]>>;
} & {
  [K in BuiltInFilterKeys<Schema>]?: FilterHandler<FilterValue<Schema[K]>>;
};

function handleBuiltInFilter(
  filterDef: AnyFilterDef,
  column: Column,
  value: unknown,
): SQL | undefined {
  switch (filterDef.id) {
    case "string": {
      const v = value as StringValue;
      switch (v.operator) {
        case "eq":
          return eq(column, v.value);
        case "neq":
          return ne(column, v.value);
        case "contains":
          return like(column, `%${v.value}%`);
        case "startsWith":
          return like(column, `${v.value}%`);
        case "endsWith":
          return like(column, `%${v.value}`);
        default:
          return undefined;
      }
    }
    case "number": {
      const v = value as NumberValue;
      switch (v.operator) {
        case "eq":
          return eq(column, v.value);
        case "neq":
          return ne(column, v.value);
        case "gt":
          return gt(column, v.value);
        case "gte":
          return gte(column, v.value);
        case "lt":
          return lt(column, v.value);
        case "lte":
          return lte(column, v.value);
        default:
          return undefined;
      }
    }
    case "date": {
      const v = value as DateValue;
      switch (v.operator) {
        case "eq":
          return eq(column, v.value);
        case "neq":
          return ne(column, v.value);
        case "gt":
          return gt(column, v.value);
        case "gte":
          return gte(column, v.value);
        case "lt":
          return lt(column, v.value);
        case "lte":
          return lte(column, v.value);
        default:
          return undefined;
      }
    }
    case "boolean": {
      return eq(column, value as boolean);
    }
    default:
      return undefined;
  }
}

function expressionToWhere<Schema extends FilterSchemaConstraint>(
  schema: Schema,
  filter: FilterExpression<Schema>,
  columns: Partial<Record<keyof Schema, Column>>,
  handlers: Partial<Record<keyof Schema, FilterHandler<unknown>>>,
): SQL | undefined {
  if (!isGroup(filter)) {
    const filterDef = schema[filter.field as keyof Schema];
    if (!filterDef) return undefined;

    const handler = handlers[filter.field as keyof Schema];
    if (handler) {
      return handler(filter.value);
    }

    const column = columns[filter.field as keyof Schema];
    if (column && isBuiltInFilter(filterDef)) {
      return handleBuiltInFilter(filterDef, column, filter.value);
    }

    return undefined;
  }

  const conditions = filter.filters
    .map((f) => expressionToWhere(schema, f, columns, handlers))
    .filter((c): c is SQL => c !== undefined);

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];

  return filter.operator === "and" ? and(...conditions) : or(...conditions);
}

type ToWhereOptions<Schema extends FilterSchemaConstraint> =
  CustomFilterKeys<Schema> extends never
    ? { handlers?: CustomHandlers<Schema> }
    : { handlers: CustomHandlers<Schema> };

type ToWhereFn<Schema extends FilterSchemaConstraint> =
  CustomFilterKeys<Schema> extends never
    ? (
        filter: Group<Schema>,
        options?: ToWhereOptions<Schema>,
      ) => SQL | undefined
    : (
        filter: Group<Schema>,
        options: ToWhereOptions<Schema>,
      ) => SQL | undefined;

function createWhereBuilder<Schema extends FilterSchemaConstraint>(
  schema: Schema,
  columns: ColumnMapping<Schema>,
): ToWhereFn<Schema> {
  return ((filter: Group<Schema>, options?: ToWhereOptions<Schema>) => {
    const handlers = (options?.handlers ?? {}) as Partial<
      Record<keyof Schema, FilterHandler<unknown>>
    >;
    return expressionToWhere(
      schema,
      filter,
      columns as Partial<Record<keyof Schema, Column>>,
      handlers,
    );
  }) as ToWhereFn<Schema>;
}

export { createWhereBuilder };
export type { ColumnMapping, CustomHandlers, ToWhereFn };
