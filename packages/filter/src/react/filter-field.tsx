"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import type { FilterStore } from "../filter-client";
import type {
  AnyFilterDef,
  FilterSchemaConstraint,
  FilterValue,
} from "../index";
import type { Condition } from "../types";
import { isGroup } from "../types";

type FilterComponentProps<Schema extends FilterSchemaConstraint> = {
  condition: Condition<Schema>;
  render: FilterFieldRenderFn<Schema>;
};

export type FilterFieldData<Schema extends FilterSchemaConstraint> = {
  id: string;
  field: keyof Schema;
  value: FilterValue<Schema[keyof Schema]>;
  onValueChange: (value: FilterValue<Schema[keyof Schema]>) => void;
  onRemove: () => void;
  definition: AnyFilterDef;
};

export type FilterFieldRenderFn<Schema extends FilterSchemaConstraint> = (
  field: FilterFieldData<Schema>,
) => ReactNode;

export function createFilterComponent<Schema extends FilterSchemaConstraint>(
  store: FilterStore<Schema>,
  schema: Schema,
) {
  return function FilterComponent({
    condition,
    render,
  }: FilterComponentProps<Schema>) {
    const currentFilter = useSyncExternalStore(
      store.subscribe,
      () => store.getFilterById(condition.id),
      () => store.getFilterById(condition.id),
    );

    if (!currentFilter || isGroup(currentFilter)) {
      return null;
    }

    const def = schema[currentFilter.field] as AnyFilterDef;

    const field: FilterFieldData<Schema> = {
      id: currentFilter.id,
      field: currentFilter.field,
      value: currentFilter.value as FilterValue<Schema[keyof Schema]>,
      onValueChange: (newValue) => {
        store.updateCondition({ id: currentFilter.id, value: newValue });
      },
      onRemove: () => {
        store.removeFilter({ id: currentFilter.id });
      },
      definition: def,
    };

    return render(field);
  };
}

export type { FilterComponentProps };
