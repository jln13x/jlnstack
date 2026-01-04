"use client";

import { useMemo, useState } from "react";
import { createFilterStore, type FilterStore } from "../filter-client";
import type { FilterSchemaConstraint, FilterValue } from "../index";
import type {
  FilterExpression,
  FilterOperator,
  Group,
  GroupInput,
} from "../types";
import { createFilterComponent } from "./filter-field";
import { createUseFilter, createUseFilterById, createUseFilterDefinitions } from "./hooks";

type AvailableFilter<Schema extends FilterSchemaConstraint> = {
  [K in keyof Schema]: { name: K } & Schema[K];
}[keyof Schema];

type UseFilterOptions<Schema extends FilterSchemaConstraint> = {
  defaultFilter?: GroupInput<Schema>;
  onFilterChange?: (filter: Group<Schema>) => void | Promise<void>;
};

type FilterActions<Schema extends FilterSchemaConstraint> = {
  addCondition: <K extends keyof Schema>(opts: {
    field: K;
    value: FilterValue<Schema[K]>;
    parentId?: string;
  }) => string;
  addGroup: (opts: { operator: FilterOperator; parentId?: string }) => string;
  updateCondition: <K extends keyof Schema>(opts: {
    id: string;
    value: FilterValue<Schema[K]>;
  }) => void;
  setOperator: (opts: { id: string; operator: FilterOperator }) => void;
  removeFilter: (opts: { id: string }) => void;
  moveFilter: (opts: {
    id: string;
    targetParentId: string;
    index: number;
  }) => void;
  groupFilters: (opts: { ids: string[]; operator: FilterOperator }) => string;
  ungroupFilter: (opts: { id: string }) => void;
  setFilter: (input: GroupInput<Schema>) => void;
  reset: () => void;
};

type UseFilterReturn<Schema extends FilterSchemaConstraint> = {
  schema: Schema;
  rootId: string;
  getFilter: () => Group<Schema>;
  getFilterById: (id: string) => FilterExpression<Schema> | undefined;
  Filter: ReturnType<typeof createFilterComponent<Schema>>;
  useFilter: () => Group<Schema>;
  useFilterById: (id: string) => FilterExpression<Schema> | undefined;
  useFilterDefinitions: () => AvailableFilter<Schema>[];
  _store: FilterStore<Schema>;
} & FilterActions<Schema>;

function useFilterHook<const Schema extends FilterSchemaConstraint>(
  schema: Schema,
  options?: UseFilterOptions<Schema>,
): UseFilterReturn<Schema> {
  const [store] = useState(() =>
    createFilterStore<Schema>({
      definitions: schema,
      defaultFilter: options?.defaultFilter,
      onFilterChange: options?.onFilterChange,
    }),
  );

  const [Filter] = useState(() => createFilterComponent(store, schema));

  return useMemo(
    () => ({
      _store: store,
      schema,
      rootId: store.rootId,
      getFilter: store.getFilter,
      getFilterById: store.getFilterById,
      addCondition: store.addCondition,
      addGroup: store.addGroup,
      updateCondition: store.updateCondition,
      setOperator: store.setOperator,
      removeFilter: store.removeFilter,
      moveFilter: store.moveFilter,
      groupFilters: store.groupFilters,
      ungroupFilter: store.ungroupFilter,
      setFilter: store.setFilter,
      reset: store.resetFilter,
      Filter,
      useFilter: createUseFilter(store),
      useFilterById: createUseFilterById(store),
      useFilterDefinitions: createUseFilterDefinitions(schema),
    }),
    [store, schema, Filter],
  );
}

export { useFilterHook as useFilter };
export type { AvailableFilter, FilterActions, UseFilterOptions, UseFilterReturn };
