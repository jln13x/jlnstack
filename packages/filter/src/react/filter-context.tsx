"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { FilterSchemaConstraint } from "../index";
import type { FilterExpression, Group } from "../types";
import { createUseFilter, createUseFilterById, createUseFilterDefinitions } from "./hooks";
import type { AvailableFilter, UseFilterReturn } from "./use-filter";

const FilterContext = createContext<UseFilterReturn<any> | null>(null);

type FilterProviderProps<Schema extends FilterSchemaConstraint> =
  UseFilterReturn<Schema> & {
    children: ReactNode;
  };

function FilterProvider<const Schema extends FilterSchemaConstraint>({
  children,
  ...filter
}: FilterProviderProps<Schema>) {
  return (
    <FilterContext.Provider value={filter as UseFilterReturn<Schema>}>
      {children}
    </FilterContext.Provider>
  );
}

function useFilterStoreInternal<Schema extends FilterSchemaConstraint>(
  name: string,
) {
  const ctx = useContext(FilterContext);
  if (!ctx) throw new Error(`${name} must be used within FilterProvider`);
  return ctx as UseFilterReturn<Schema>;
}

function useFilterContext<
  Schema extends FilterSchemaConstraint,
>(): UseFilterReturn<Schema> {
  return useFilterStoreInternal<Schema>("useFilterContext");
}

function useFilter<Schema extends FilterSchemaConstraint>(): Group<Schema> {
  const { _store } = useFilterStoreInternal<Schema>("useFilter");
  return createUseFilter(_store)();
}

function useFilterById<Schema extends FilterSchemaConstraint>(
  id: string,
): FilterExpression<Schema> | undefined {
  const { _store } = useFilterStoreInternal<Schema>("useFilterById");
  return createUseFilterById(_store)(id);
}

function useFilterDefinitions<
  Schema extends FilterSchemaConstraint,
>(): AvailableFilter<Schema>[] {
  const { schema } = useFilterStoreInternal<Schema>("useFilterDefinitions");
  return createUseFilterDefinitions(schema)();
}

export {
  FilterProvider,
  useFilter,
  useFilterById,
  useFilterContext,
  useFilterDefinitions,
};

export type { FilterProviderProps };
