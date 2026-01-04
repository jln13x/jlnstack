"use client";

import type { FilterSchemaConstraint } from "../index";
import {
  useFilterContext,
  useFilterDefinitions,
  useFilterValue,
  useFilterValues,
} from "./filter-context";
import { type UseFilterOptions, useFilter } from "./use-filter";

export function createFilterHooks<Schema extends FilterSchemaConstraint>(
  schema: Schema,
) {
  return {
    useFilter: (options?: UseFilterOptions<Schema>) =>
      useFilter(schema, options),
    useFilterContext: () => useFilterContext<Schema>(),
    useFilterValue: <K extends keyof Schema>(name: K) =>
      useFilterValue<Schema, K>(name),
    useFilterValues: () => useFilterValues<Schema>(),
    useFilterDefinitions: () => useFilterDefinitions<Schema>(),
  };
}
