import type { FilterInput, FilterSchemaConstraint } from "./index";

type FilterDefinitions<Schema extends FilterSchemaConstraint> = {
  [K in keyof Schema]: Schema[K];
};

type FilterStoreOptions<Schema extends FilterSchemaConstraint> = {
  definitions: FilterDefinitions<Schema>;
  defaultFilters?: FilterInput<Schema>;
  onFilterChange?: (filters: FilterInput<Schema>) => void | Promise<void>;
};

type Listener = () => void;

export type { FilterDefinitions, FilterStoreOptions, Listener };
