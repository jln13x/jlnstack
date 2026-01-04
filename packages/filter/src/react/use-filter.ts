"use client";

import { useMemo, useState } from "react";
import { createFilterStore, type FilterStore } from "../filter-client";
import type {
  FilterInput,
  FilterSchemaConstraint,
  FilterValue,
} from "../index";
import { createFilterComponent } from "./filter-field";
import {
  createUseFilterDefinitions,
  createUseFilterValue,
  createUseFilterValues,
} from "./hooks";

type AvailableFilter<Schema extends FilterSchemaConstraint> = {
  [K in keyof Schema]: { name: K } & Schema[K];
}[keyof Schema];

type UseFilterOptions<Schema extends FilterSchemaConstraint> = {
  defaultValues?: FilterInput<Schema>;
  onFilterChange?: (filters: FilterInput<Schema>) => FilterInput<Schema>;
};

type UseFilterReturn<Schema extends FilterSchemaConstraint> = {
  schema: Schema;
  setFilter: <K extends keyof Schema>(
    key: K,
    value: FilterValue<Schema[K]> | undefined,
  ) => void;
  setFilters: (
    filtersOrUpdater:
      | FilterInput<Schema>
      | ((prev: FilterInput<Schema>) => FilterInput<Schema>),
  ) => void;
  clear: (key: keyof Schema) => void;
  reset: () => void;
  getFilters: () => FilterInput<Schema>;
  Filter: ReturnType<typeof createFilterComponent<Schema>>;
  useFilterValues: () => FilterInput<Schema>;
  useFilterValue: <K extends keyof Schema>(name: K) => FilterInput<Schema>[K];
  useFilterDefinitions: () => AvailableFilter<Schema>[];
  _store: FilterStore<Schema>;
};

function useFilter<const Schema extends FilterSchemaConstraint>(
  schema: Schema,
  options?: UseFilterOptions<Schema>,
): UseFilterReturn<Schema> {
  const [store] = useState(() =>
    createFilterStore<Schema>({
      definitions: schema,
      defaultFilters: options?.defaultValues,
      onFilterChange: options?.onFilterChange,
    }),
  );

  const [Filter] = useState(() => createFilterComponent(store, schema));

  return useMemo(
    () => ({
      _store: store,
      schema,
      setFilter: <K extends keyof Schema>(
        key: K,
        value: FilterValue<Schema[K]> | undefined,
      ) => {
        store.setFilter(key, value as FilterInput<Schema>[K]);
      },
      setFilters: store.setFilters,
      clear: (key: keyof Schema) =>
        store.setFilter(key, undefined as FilterInput<Schema>[keyof Schema]),
      reset: store.resetFilters,
      getFilters: store.getFilters,
      Filter,
      useFilterValues: createUseFilterValues(store),
      useFilterValue: createUseFilterValue(store),
      useFilterDefinitions: createUseFilterDefinitions(schema),
    }),
    [store, schema, Filter],
  );
}

export { useFilter };
export type { AvailableFilter, UseFilterOptions, UseFilterReturn };
