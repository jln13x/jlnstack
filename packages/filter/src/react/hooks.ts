"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { FilterStore } from "../filter-client";
import type { AnyFilterDef, FilterSchemaConstraint } from "../index";
import type { AvailableFilter } from "./use-filter";

export function createUseFilterValues<Schema extends FilterSchemaConstraint>(
  store: FilterStore<Schema>,
) {
  return () =>
    useSyncExternalStore(store.subscribe, store.getFilters, store.getFilters);
}

export function createUseFilterValue<Schema extends FilterSchemaConstraint>(
  store: FilterStore<Schema>,
) {
  return <K extends keyof Schema>(name: K) =>
    useSyncExternalStore(
      store.subscribe,
      () => store.getFilters()[name],
      () => store.getFilters()[name],
    );
}

export function createUseFilterDefinitions<
  Schema extends FilterSchemaConstraint,
>(schema: Schema) {
  return () => {
    // biome-ignore lint/correctness/useExhaustiveDependencies: its fine
    return useMemo(() => {
      const result: AvailableFilter<Schema, keyof Schema>[] = [];
      for (const key of Object.keys(schema) as (keyof Schema & string)[]) {
        const def = schema[key] as AnyFilterDef;
        result.push({
          name: key,
          definition: def,
        } as AvailableFilter<Schema, typeof key>);
      }
      return result;
    }, []);
  };
}
