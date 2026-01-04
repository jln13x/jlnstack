"use client";

import type { FilterSchemaConstraint } from "../index";
import {
  useFilter,
  useFilterById,
  useFilterContext,
  useFilterDefinitions,
} from "./filter-context";
import { type UseFilterOptions, useFilter as useFilterHook } from "./use-filter";

export function createFilterHooks<Schema extends FilterSchemaConstraint>(
  schema: Schema,
) {
  return {
    useFilter: (options?: UseFilterOptions<Schema>) =>
      useFilterHook(schema, options),
    useFilterContext: () => useFilterContext<Schema>(),
    useFilterTree: () => useFilter<Schema>(),
    useFilterById: (id: string) => useFilterById<Schema>(id),
    useFilterDefinitions: () => useFilterDefinitions<Schema>(),
  };
}
