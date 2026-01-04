import type { FilterInput, FilterSchemaConstraint } from "./index";
import type { FilterDefinitions, FilterStoreOptions, Listener } from "./types";

class FilterStore<Schema extends FilterSchemaConstraint> {
  private _filters: FilterInput<Schema>;
  private _definitions: FilterDefinitions<Schema>;
  private _defaultFilters: FilterInput<Schema>;
  private _onFilterChange?: (
    filters: FilterInput<Schema>,
  ) => void | Promise<void>;
  private _listeners: Set<Listener> = new Set();

  constructor(options: FilterStoreOptions<Schema>) {
    this._definitions = options.definitions;
    this._defaultFilters =
      options.defaultFilters ?? ({} as FilterInput<Schema>);
    this._filters = this._defaultFilters;
    this._onFilterChange = options.onFilterChange;
  }

  get filters(): FilterInput<Schema> {
    return this._filters;
  }

  get definitions(): FilterDefinitions<Schema> {
    return this._definitions;
  }

  getFilters = (): FilterInput<Schema> => {
    return this._filters;
  };

  setFilters = (
    filtersOrUpdater:
      | FilterInput<Schema>
      | ((prev: FilterInput<Schema>) => FilterInput<Schema>),
  ): void => {
    const next =
      typeof filtersOrUpdater === "function"
        ? filtersOrUpdater(this._filters)
        : filtersOrUpdater;
    this._filters = next;
    this._onFilterChange?.(next);
    this._notify();
  };

  setFilter = <K extends keyof Schema>(
    key: K,
    value: FilterInput<Schema>[K],
  ): void => {
    const next = { ...this._filters, [key]: value };
    this._filters = next;
    this._onFilterChange?.(next);
    this._notify();
  };

  resetFilters = (): void => {
    this._filters = this._defaultFilters;
    this._onFilterChange?.(this._defaultFilters);
    this._notify();
  };

  subscribe = (listener: Listener): (() => void) => {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  };

  private _notify(): void {
    for (const listener of this._listeners) {
      listener();
    }
  }
}

function createFilterStore<Schema extends FilterSchemaConstraint>(
  options: FilterStoreOptions<Schema>,
): FilterStore<Schema> {
  return new FilterStore(options);
}

export { createFilterStore, FilterStore };
