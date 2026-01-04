import { and, or, type SQL } from "drizzle-orm";
import type { FilterSchemaConstraint, FilterValue } from "./index";
import type { FilterExpression, Group } from "./types";
import { isGroup } from "./types";

type FilterHandlers<Schema extends FilterSchemaConstraint> = {
  [K in keyof Schema]?: (value: FilterValue<Schema[K]>) => SQL | undefined;
};

function expressionToWhere<Schema extends FilterSchemaConstraint>(
  filter: FilterExpression<Schema>,
  handlers: FilterHandlers<Schema>,
): SQL | undefined {
  if (!isGroup(filter)) {
    const handler = handlers[filter.field] as
      | ((value: unknown) => SQL | undefined)
      | undefined;
    return handler?.(filter.value);
  }

  const conditions = filter.filters
    .map((f) => expressionToWhere(f, handlers))
    .filter((c): c is SQL => c !== undefined);

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];

  return filter.operator === "and" ? and(...conditions) : or(...conditions);
}

function toWhere<Schema extends FilterSchemaConstraint>(
  _schema: Schema,
  filter: Group<Schema>,
  handlers: FilterHandlers<Schema>,
): SQL | undefined {
  return expressionToWhere(filter, handlers);
}

export { toWhere };
export type { FilterHandlers };
