"use client";

import { createContext, type ReactNode, useContext } from "react";
import type { FilterSchemaConstraint } from "../index";
import {
  createUseFilterDefinitions,
  createUseFilterValue,
  createUseFilterValues,
} from "./hooks";
import type { UseFilterReturn } from "./use-filter";

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

function useFilterValue<
  Schema extends FilterSchemaConstraint,
  K extends keyof Schema = keyof Schema,
>(name: K) {
  const { _store } = useFilterStoreInternal<Schema>(`useFilterValue`);
  return createUseFilterValue(_store)(name);
}

function useFilterValues<Schema extends FilterSchemaConstraint>() {
  const { _store } = useFilterStoreInternal<Schema>(`useFilterValues`);
  return createUseFilterValues(_store)();
}

function useFilterDefinitions<Schema extends FilterSchemaConstraint>() {
  const { schema } = useFilterStoreInternal<Schema>(`useFilterDefinitions`);
  return createUseFilterDefinitions(schema)();
}

export {
  FilterProvider,
  useFilterDefinitions,
  useFilterContext,
  useFilterValue,
  useFilterValues,
};

export type { FilterProviderProps };
