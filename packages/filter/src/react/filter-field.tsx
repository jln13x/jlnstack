"use client";

import { type ReactNode, useSyncExternalStore } from "react";
import type { FilterStore } from "../filter-client";
import type {
  AnyFilterDef,
  FilterInput,
  FilterSchemaConstraint,
  FilterValue,
} from "../index";

type FilterComponentProps<
  Schema extends FilterSchemaConstraint,
  Name extends keyof Schema & string,
> = {
  name: Name;
  render: FilterFieldRenderFn<Schema[Name]>;
};

export type FilterFieldData<Def extends AnyFilterDef> = {
  name: string;
  type: Def["id"];
  value: FilterValue<Def> | undefined;
  onValueChange: (value: FilterValue<Def> | undefined) => void;
  onClear: () => void;
  definition: Def;
};

export type FilterFieldRenderFn<Def extends AnyFilterDef> = (
  field: FilterFieldData<Def>,
) => ReactNode;

export function createFilterComponent<Schema extends FilterSchemaConstraint>(
  store: FilterStore<Schema>,
  schema: Schema,
) {
  return function FilterComponent<Name extends keyof Schema & string>({
    name,
    render,
  }: FilterComponentProps<Schema, Name>) {
    const currentValue = useSyncExternalStore(
      store.subscribe,
      () => store.getFilters()[name],
      () => store.getFilters()[name],
    );

    const def = schema[name] as AnyFilterDef;

    const field: FilterFieldData<typeof def> = {
      name,
      type: def.id,
      value: currentValue,
      onValueChange: (newValue) => {
        store.setFilter(name, newValue as FilterInput<Schema>[keyof Schema]);
      },
      onClear: () => {
        store.setFilter(name, undefined as FilterInput<Schema>[keyof Schema]);
      },
      definition: def,
    };

    return render(field as Parameters<typeof render>[0]);
  };
}

export type { FilterComponentProps };
