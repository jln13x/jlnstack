"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { FilterStore } from "../filter-client";
import type { AnyFilterDef, FilterSchemaConstraint } from "../index";
import type { FilterExpression, Group } from "../types";
import type { AvailableFilter } from "./use-filter";

export function createUseFilter<Schema extends FilterSchemaConstraint>(
  store: FilterStore<Schema>,
) {
  return (): Group<Schema> =>
    useSyncExternalStore(store.subscribe, store.getFilter, store.getFilter);
}

export function createUseFilterById<Schema extends FilterSchemaConstraint>(
  store: FilterStore<Schema>,
) {
  return (id: string): FilterExpression<Schema> | undefined =>
    useSyncExternalStore(
      store.subscribe,
      () => store.getFilterById(id),
      () => store.getFilterById(id),
    );
}

export function createUseFilterDefinitions<
  Schema extends FilterSchemaConstraint,
>(schema: Schema) {
  return () => {
    // biome-ignore lint/correctness/useExhaustiveDependencies: its fine
    return useMemo(() => {
      const result: AvailableFilter<Schema>[] = [];
      for (const key of Object.keys(schema) as (keyof Schema & string)[]) {
        const { _value: _, schema: __, ...def } = schema[key] as AnyFilterDef;

        result.push({
          name: key,
          ...def,
        } as AvailableFilter<Schema>);
      }
      return result;
    }, []);
  };
}
