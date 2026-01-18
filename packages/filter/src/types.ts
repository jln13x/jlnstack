import type { FilterSchemaConstraint, FilterValue } from "./index";

type FilterDefinitions<Schema extends FilterSchemaConstraint> = {
  [K in keyof Schema]: Schema[K];
};

type Listener = () => void;

type FilterOperator = "and" | "or";

// Input types (no IDs) - for building filters, defaults, persistence
type ConditionInput<Schema extends FilterSchemaConstraint> = {
  [K in keyof Schema]: {
    type: "condition";
    field: K;
    value: FilterValue<Schema[K]>;
  };
}[keyof Schema];

type GroupInput<Schema extends FilterSchemaConstraint> = {
  type: "group";
  operator: FilterOperator;
  filters: FilterExpressionInput<Schema>[];
};

type FilterExpressionInput<Schema extends FilterSchemaConstraint> =
  | ConditionInput<Schema>
  | GroupInput<Schema>;

// Runtime types (with IDs) - for UI operations
type Condition<Schema extends FilterSchemaConstraint> = {
  [K in keyof Schema]: {
    type: "condition";
    id: string;
    field: K;
    value: FilterValue<Schema[K]>;
  };
}[keyof Schema];

type Group<Schema extends FilterSchemaConstraint> = {
  type: "group";
  id: string;
  operator: FilterOperator;
  filters: FilterExpression<Schema>[];
  root?: boolean;
};

type FilterExpression<Schema extends FilterSchemaConstraint> =
  | Condition<Schema>
  | Group<Schema>;

// Type guards
function isCondition<Schema extends FilterSchemaConstraint>(
  filter: FilterExpression<Schema>,
): filter is Condition<Schema> {
  return filter.type === "condition";
}

function isGroup<Schema extends FilterSchemaConstraint>(
  filter: FilterExpression<Schema>,
): filter is Group<Schema> {
  return filter.type === "group";
}

function isConditionInput<Schema extends FilterSchemaConstraint>(
  filter: FilterExpressionInput<Schema>,
): filter is ConditionInput<Schema> {
  return filter.type === "condition";
}

function isGroupInput<Schema extends FilterSchemaConstraint>(
  filter: FilterExpressionInput<Schema>,
): filter is GroupInput<Schema> {
  return filter.type === "group";
}

// Store options
type FilterStoreOptions<Schema extends FilterSchemaConstraint> = {
  definitions: FilterDefinitions<Schema>;
  defaultFilter?: GroupInput<Schema>;
  onFilterChange?: (filter: Group<Schema>) => void | Promise<void>;
  idPrefix?: string;
};

export { isCondition, isConditionInput, isGroup, isGroupInput };

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
  Listener,
};
