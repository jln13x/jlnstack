import type { FilterSchemaConstraint, FilterValue } from "./index";
import type {
  Condition,
  FilterDefinitions,
  FilterExpression,
  FilterExpressionInput,
  FilterOperator,
  FilterStoreOptions,
  Group,
  GroupInput,
  Listener,
} from "./types";
import { isConditionInput, isGroup } from "./types";

function generateId(): string {
  return crypto.randomUUID();
}

function hydrateFilter<Schema extends FilterSchemaConstraint>(
  input: FilterExpressionInput<Schema>,
): FilterExpression<Schema> {
  if (isConditionInput(input)) {
    return {
      id: generateId(),
      field: input.field,
      value: input.value,
    } as Condition<Schema>;
  }
  return {
    id: generateId(),
    operator: input.operator,
    filters: input.filters.map((f) => hydrateFilter(f)),
  } as Group<Schema>;
}

function hydrateGroup<Schema extends FilterSchemaConstraint>(
  input: GroupInput<Schema>,
): Group<Schema> {
  return {
    id: generateId(),
    operator: input.operator,
    filters: input.filters.map((f) => hydrateFilter(f)),
  };
}

function createEmptyRoot<
  Schema extends FilterSchemaConstraint,
>(): Group<Schema> {
  return {
    id: generateId(),
    operator: "and",
    filters: [],
  };
}

class FilterStore<Schema extends FilterSchemaConstraint> {
  private _root: Group<Schema>;
  private _definitions: FilterDefinitions<Schema>;
  private _defaultFilter: GroupInput<Schema> | undefined;
  private _onFilterChange?: (filter: Group<Schema>) => void | Promise<void>;
  private _listeners: Set<Listener> = new Set();
  private _index: Map<string, FilterExpression<Schema>> = new Map();
  private _parentIndex: Map<string, string> = new Map();

  constructor(options: FilterStoreOptions<Schema>) {
    this._definitions = options.definitions;
    this._defaultFilter = options.defaultFilter;
    this._onFilterChange = options.onFilterChange;

    this._root = options.defaultFilter
      ? hydrateGroup(options.defaultFilter)
      : createEmptyRoot();

    this._rebuildIndex();
  }

  private _rebuildIndex(): void {
    this._index.clear();
    this._parentIndex.clear();
    this._indexFilter(this._root, null);
  }

  private _indexFilter(
    filter: FilterExpression<Schema>,
    parentId: string | null,
  ): void {
    this._index.set(filter.id, filter);
    if (parentId) {
      this._parentIndex.set(filter.id, parentId);
    }
    if (isGroup(filter)) {
      for (const child of filter.filters) {
        this._indexFilter(child, filter.id);
      }
    }
  }

  private _notify(): void {
    this._onFilterChange?.(this._root);
    for (const listener of this._listeners) {
      listener();
    }
  }

  private _findAndUpdate(
    group: Group<Schema>,
    targetId: string,
    updater: (
      filters: FilterExpression<Schema>[],
    ) => FilterExpression<Schema>[],
  ): Group<Schema> {
    if (group.id === targetId) {
      return { ...group, filters: updater(group.filters) };
    }
    return {
      ...group,
      filters: group.filters.map((f) =>
        isGroup(f) ? this._findAndUpdate(f, targetId, updater) : f,
      ),
    };
  }

  private _removeFromTree(
    group: Group<Schema>,
    targetId: string,
  ): Group<Schema> {
    return {
      ...group,
      filters: group.filters
        .filter((f) => f.id !== targetId)
        .map((f) => (isGroup(f) ? this._removeFromTree(f, targetId) : f)),
    };
  }

  get filter(): Group<Schema> {
    return this._root;
  }

  get definitions(): FilterDefinitions<Schema> {
    return this._definitions;
  }

  get rootId(): string {
    return this._root.id;
  }

  getFilter = (): Group<Schema> => {
    return this._root;
  };

  getFilterById = (id: string): FilterExpression<Schema> | undefined => {
    return this._index.get(id);
  };

  getParentId = (id: string): string | undefined => {
    return this._parentIndex.get(id);
  };

  addCondition = <K extends keyof Schema>(opts: {
    field: K;
    value: FilterValue<Schema[K]>;
    parentId?: string;
  }): string => {
    const parentId = opts.parentId ?? this._root.id;
    const condition: Condition<Schema> = {
      id: generateId(),
      field: opts.field,
      value: opts.value,
    } as Condition<Schema>;

    this._root = this._findAndUpdate(this._root, parentId, (filters) => [
      ...filters,
      condition,
    ]);
    this._rebuildIndex();
    this._notify();
    return condition.id;
  };

  addGroup = (opts: {
    operator: FilterOperator;
    parentId?: string;
  }): string => {
    const parentId = opts.parentId ?? this._root.id;
    const group: Group<Schema> = {
      id: generateId(),
      operator: opts.operator,
      filters: [],
    };

    this._root = this._findAndUpdate(this._root, parentId, (filters) => [
      ...filters,
      group,
    ]);
    this._rebuildIndex();
    this._notify();
    return group.id;
  };

  updateCondition = <K extends keyof Schema>(opts: {
    id: string;
    value: FilterValue<Schema[K]>;
  }): void => {
    const updateValue = (
      filter: FilterExpression<Schema>,
    ): FilterExpression<Schema> => {
      if (filter.id === opts.id && !isGroup(filter)) {
        return { ...filter, value: opts.value } as Condition<Schema>;
      }
      if (isGroup(filter)) {
        return { ...filter, filters: filter.filters.map(updateValue) };
      }
      return filter;
    };

    this._root = updateValue(this._root) as Group<Schema>;
    this._rebuildIndex();
    this._notify();
  };

  setOperator = (opts: { id: string; operator: FilterOperator }): void => {
    const updateOperator = (
      filter: FilterExpression<Schema>,
    ): FilterExpression<Schema> => {
      if (filter.id === opts.id && isGroup(filter)) {
        return { ...filter, operator: opts.operator };
      }
      if (isGroup(filter)) {
        return { ...filter, filters: filter.filters.map(updateOperator) };
      }
      return filter;
    };

    this._root = updateOperator(this._root) as Group<Schema>;
    this._rebuildIndex();
    this._notify();
  };

  removeFilter = (opts: { id: string }): void => {
    if (opts.id === this._root.id) return;
    this._root = this._removeFromTree(this._root, opts.id);
    this._rebuildIndex();
    this._notify();
  };

  moveFilter = (opts: {
    id: string;
    targetParentId: string;
    index: number;
  }): void => {
    const filter = this._index.get(opts.id);
    if (!filter || opts.id === this._root.id) return;

    this._root = this._removeFromTree(this._root, opts.id);

    this._root = this._findAndUpdate(
      this._root,
      opts.targetParentId,
      (filters) => {
        const newFilters = [...filters];
        newFilters.splice(opts.index, 0, filter);
        return newFilters;
      },
    );

    this._rebuildIndex();
    this._notify();
  };

  groupFilters = (opts: {
    ids: string[];
    operator: FilterOperator;
  }): string => {
    const filters = opts.ids
      .map((id) => this._index.get(id))
      .filter((f): f is FilterExpression<Schema> => f !== undefined);

    if (filters.length === 0 || opts.ids[0] === undefined) return "";

    const parentId = this._parentIndex.get(opts.ids[0]) ?? this._root.id;

    for (const id of opts.ids) {
      this._root = this._removeFromTree(this._root, id);
    }

    const newGroup: Group<Schema> = {
      id: generateId(),
      operator: opts.operator,
      filters,
    };

    this._root = this._findAndUpdate(this._root, parentId, (existing) => [
      ...existing,
      newGroup,
    ]);

    this._rebuildIndex();
    this._notify();
    return newGroup.id;
  };

  ungroupFilter = (opts: { id: string }): void => {
    const group = this._index.get(opts.id);
    if (!group || !isGroup(group) || opts.id === this._root.id) return;

    const parentId = this._parentIndex.get(opts.id);
    if (!parentId) return;

    const children = group.filters;

    this._root = this._removeFromTree(this._root, opts.id);

    this._root = this._findAndUpdate(this._root, parentId, (filters) => [
      ...filters,
      ...children,
    ]);

    this._rebuildIndex();
    this._notify();
  };

  setFilter = (input: GroupInput<Schema>): void => {
    this._root = hydrateGroup(input);
    this._rebuildIndex();
    this._notify();
  };

  resetFilter = (): void => {
    this._root = this._defaultFilter
      ? hydrateGroup(this._defaultFilter)
      : createEmptyRoot();
    this._rebuildIndex();
    this._notify();
  };

  subscribe = (listener: Listener): (() => void) => {
    this._listeners.add(listener);
    return () => {
      this._listeners.delete(listener);
    };
  };
}

function createFilterStore<Schema extends FilterSchemaConstraint>(
  options: FilterStoreOptions<Schema>,
): FilterStore<Schema> {
  return new FilterStore(options);
}

export { createFilterStore, FilterStore };
