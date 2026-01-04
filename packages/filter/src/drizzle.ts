import { and, type SQL } from "drizzle-orm";
import type { FilterInput, FilterSchemaConstraint, FilterValue } from "./index";

type FilterHandlers<Schema extends FilterSchemaConstraint> = {
  [K in keyof Schema]?: (value: FilterValue<Schema[K]>) => SQL | undefined;
};

function toWhere<Schema extends FilterSchemaConstraint>(
  _schema: Schema,
  filters: FilterInput<Schema>,
  handlers: FilterHandlers<Schema>,
): SQL | undefined {
  const conditions: SQL[] = [];

  for (const key of Object.keys(handlers)) {
    const filterValue = filters[key as keyof typeof filters];
    if (filterValue === undefined) continue;

    const handler = handlers[key as keyof typeof handlers] as
      | ((value: unknown) => SQL | undefined)
      | undefined;
    if (!handler) continue;

    const condition = handler(filterValue);
    if (condition) conditions.push(condition);
  }

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];
  return and(...conditions);
}

export { toWhere };
export type { FilterHandlers };
