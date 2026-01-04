"use client";

import type { FilterSchemaConstraint } from "../index";
import {
  useFilterDefinitions,
  useFilterContext,
  useFilterValue,
  useFilterValues,
} from "./filter-context";
import { useFilter } from "./use-filter";

export function createFilterHooks<Schema extends FilterSchemaConstraint>(
  schema: Schema,
) {
  return {
    useFilter: () => useFilter(schema),
    useFilterContext: () => useFilterContext<Schema>(),
    useFilterValue: <K extends keyof Schema>(name: K) =>
      useFilterValue<Schema, K>(name),
    useFilterValues: () => useFilterValues<Schema>(),
    useFilterDefinitions: () => useFilterDefinitions<Schema>(),
  }; 
}
