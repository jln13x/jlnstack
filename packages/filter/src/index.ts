import type { StandardSchemaV1 } from "@standard-schema/spec";

type FilterOptions = {
  operators?: string[];
};

type FilterDef<
  Id extends string = string,
  Value = unknown,
  Options extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: Id;
  schema?: StandardSchemaV1<Value>;
  _value?: Value;
} & Options;

type AnyFilterDef = FilterDef<string, unknown, Record<string, unknown>>;

type FilterValue<F extends AnyFilterDef> = F extends FilterDef<
  string,
  infer V,
  Record<string, unknown>
>
  ? V
  : never;

type FilterSchemaConstraint = Record<string, AnyFilterDef>;

type Filters<Schema extends FilterSchemaConstraint> = Schema;

type InferFilterKeys<F extends Filters<any>> = keyof F;

type FilterInput<Schema extends FilterSchemaConstraint> = {
  [K in keyof Schema]?: FilterValue<Schema[K]>;
};

type RequiredKeys<T> = {
  [K in keyof T]-?: {} extends Pick<T, K> ? never : K;
}[keyof T];

type HasRequiredKeys<T> = RequiredKeys<T> extends never ? false : true;

type OptionsFunction<
  Id extends string,
  Value,
  Options extends Record<string, unknown>,
> = HasRequiredKeys<Options> extends true
  ? (opts: Options) => FilterDef<Id, Value, Options>
  : (opts?: Options) => FilterDef<Id, Value, Options>;

type FilterBuilder<Id extends string, Value> = {
  options: <Options extends Record<string, unknown>>() => OptionsFunction<
    Id,
    Value,
    Options
  >;
};

type FilterBuilderWithSchema<Id extends string, Value> = FilterBuilder<
  Id,
  Value
> & {
  schema: StandardSchemaV1<Value>;
};

function createFilterBuilder<Id extends string, Value>(
  id: Id,
  schema?: StandardSchemaV1<Value>,
): FilterBuilder<Id, Value> {
  return {
    options: <Options extends Record<string, unknown>>() => {
      return ((opts?: Options): FilterDef<Id, Value, Options> =>
        ({
          id,
          schema,
          ...opts,
        }) as FilterDef<Id, Value, Options>) as OptionsFunction<
        Id,
        Value,
        Options
      >;
    },
  };
}

function createFilter<const Id extends string>(id: Id) {
  function input<Value>(): FilterBuilder<Id, Value>;
  function input<Schema extends StandardSchemaV1>(
    schema: Schema,
  ): FilterBuilderWithSchema<Id, StandardSchemaV1.InferInput<Schema>>;
  function input(schema?: StandardSchemaV1) {
    return createFilterBuilder(id, schema);
  }

  return { input };
}

function defineFilters<const Schema extends FilterSchemaConstraint>(
  schema: Schema,
): Filters<Schema> {
  return schema as Filters<Schema>;
}

export { createFilter, defineFilters };
export { createFilterStore, FilterStore } from "./filter-client";
export type {
  AnyFilterDef,
  FilterBuilder,
  FilterDef,
  FilterInput,
  FilterOptions,
  FilterSchemaConstraint,
  Filters,
  FilterValue,
  InferFilterKeys,
};

export * from "./built-in";
export type { BooleanFilterOptions } from "./built-in/boolean-filter";
export type {
  DateFilterOptions,
  DateOperators,
  DateValue,
} from "./built-in/date-filter";
export type {
  NumberFilterOptions,
  NumberOperators,
  NumberValue,
} from "./built-in/number-filter";
export type {
  StringFilterOptions,
  StringOperators,
  StringValue,
} from "./built-in/string-filter";
export type {
  Condition,
  ConditionInput,
  FilterDefinitions,
  FilterExpression,
  FilterExpressionInput,
  FilterOperator,
  FilterStoreOptions,
  Group,
  GroupInput,
} from "./types";
export {
  isCondition,
  isConditionInput,
  isGroup,
  isGroupInput,
} from "./types";

// Helper functions for building filters
function condition<
  Schema extends FilterSchemaConstraint,
  K extends keyof Schema,
>(field: K, value: FilterValue<Schema[K]>): ConditionInput<Schema> {
  return { type: "condition", field, value } as ConditionInput<Schema>;
}

function and<Schema extends FilterSchemaConstraint>(
  ...filters: FilterExpressionInput<Schema>[]
): GroupInput<Schema> {
  return { type: "group", operator: "and", filters };
}

function or<Schema extends FilterSchemaConstraint>(
  ...filters: FilterExpressionInput<Schema>[]
): GroupInput<Schema> {
  return { type: "group", operator: "or", filters };
}

export { and, condition, or };

import type {
  ConditionInput,
  FilterExpressionInput,
  GroupInput,
} from "./types";
