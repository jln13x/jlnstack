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

function error(message: string): never {
  throw new Error(message);
}

function hydrateFilter<Schema extends FilterSchemaConstraint>(
  input: FilterExpressionInput<Schema>,
): FilterExpression<Schema> {
  if (isConditionInput(input)) {
    return {
      type: "condition",
      id: generateId(),
      field: input.field,
      value: input.value,
    } as Condition<Schema>;
  }
  return {
    type: "group",
    id: generateId(),
    operator: input.operator,
    filters: input.filters.map((f) => hydrateFilter(f)),
  } as Group<Schema>;
}

function hydrateGroup<Schema extends FilterSchemaConstraint>(
  input: GroupInput<Schema>,
  isRoot = false,
): Group<Schema> {
  return {
    type: "group",
    id: generateId(),
    operator: input.operator,
    filters: input.filters.map((f) => hydrateFilter(f)),
    ...(isRoot && { root: true }),
  };
}

function createEmptyRoot<
  Schema extends FilterSchemaConstraint,
>(): Group<Schema> {
  return {
    type: "group",
    id: generateId(),
    operator: "and",
    filters: [],
    root: true,
  };
}

class FilterStore<Schema extends FilterSchemaConstraint> {
  private _root: Group<Schema>;
  private _definitions: FilterDefinitions<Schema>;
  private _defaultFilter: GroupInput<Schema> | undefined;
  private _onFilterChange?: (filter: Group<Schema>) => void | Promise<void>;
  private _listeners: Set<Listener> = new Set();

  constructor(options: FilterStoreOptions<Schema>) {
    this._definitions = options.definitions;
    this._defaultFilter = options.defaultFilter;
    this._onFilterChange = options.onFilterChange;

    this._root = options.defaultFilter
      ? hydrateGroup(options.defaultFilter, true)
      : createEmptyRoot();
  }

  private _findById(id: string): FilterExpression<Schema> | undefined {
    const search = (
      filter: FilterExpression<Schema>,
    ): FilterExpression<Schema> | undefined => {
      if (filter.id === id) return filter;
      if (isGroup(filter)) {
        for (const child of filter.filters) {
          const found = search(child);
          if (found) return found;
        }
      }
      return undefined;
    };
    return search(this._root);
  }

  private _findParentId(id: string): string | undefined {
    const search = (
      filter: FilterExpression<Schema>,
      groupId: string | undefined,
    ): string | undefined => {
      if (filter.id === id) return groupId;
      if (isGroup(filter)) {
        for (const child of filter.filters) {
          const found = search(child, filter.id);
          if (found !== undefined) return found;
        }
      }
      return undefined;
    };
    return search(this._root, undefined);
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

  get rootId(): string {
    return this._root.id;
  }

  get definitions(): FilterDefinitions<Schema> {
    return this._definitions;
  }

  getFilter = (): Group<Schema> => {
    return this._root;
  };

  getFilterById = (id: string): FilterExpression<Schema> | undefined => {
    return this._findById(id);
  };

  getParentId = (id: string): string | undefined => {
    return this._findParentId(id);
  };

  addCondition = <K extends keyof Schema>(opts: {
    field: K;
    value: FilterValue<Schema[K]>;
    groupId?: string;
  }): string => {
    const groupId = opts.groupId ?? this._root.id;
    const condition: Condition<Schema> = {
      type: "condition",
      id: generateId(),
      field: opts.field,
      value: opts.value,
    } as Condition<Schema>;

    this._root = this._findAndUpdate(this._root, groupId, (filters) => [
      ...filters,
      condition,
    ]);
    this._notify();
    return condition.id;
  };

  addGroup = (opts: { operator: FilterOperator; groupId?: string }): string => {
    const groupId = opts.groupId ?? this._root.id;
    const group: Group<Schema> = {
      type: "group",
      id: generateId(),
      operator: opts.operator,
      filters: [],
    };

    this._root = this._findAndUpdate(this._root, groupId, (filters) => [
      ...filters,
      group,
    ]);
    this._notify();
    return group.id;
  };

  updateCondition = <K extends keyof Schema>(opts: {
    id: string;
    value: FilterValue<Schema[K]>;
  }): void => {
    const existing = this._findById(opts.id);
    if (!existing) error(`Condition with id "${opts.id}" not found`);
    if (isGroup(existing))
      error(`Cannot update condition: "${opts.id}" is a group`);

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
    this._notify();
  };

  setOperator = (opts: { id: string; operator: FilterOperator }): void => {
    const existing = this._findById(opts.id);
    if (!existing) error(`Group with id "${opts.id}" not found`);
    if (!isGroup(existing))
      error(`Cannot set operator: "${opts.id}" is not a group`);

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
    this._notify();
  };

  removeFilter = (opts: { id: string }): void => {
    if (opts.id === this._root.id) error("Cannot remove root group");
    const existing = this._findById(opts.id);
    if (!existing) error(`Filter with id "${opts.id}" not found`);

    this._root = this._removeFromTree(this._root, opts.id);
    this._notify();
  };

  moveFilter = (opts: {
    id: string;
    targetGroupId: string;
    index: number;
  }): void => {
    if (opts.id === this._root.id) error("Cannot move root group");
    const filter = this._findById(opts.id);
    if (!filter) error(`Filter with id "${opts.id}" not found`);
    const targetGroup = this._findById(opts.targetGroupId);
    if (!targetGroup) {
      error(`Target group with id "${opts.targetGroupId}" not found`);
    }
    if (!isGroup(targetGroup)) {
      error(`Target group "${opts.targetGroupId}" is not a group`);
    }

    this._root = this._removeFromTree(this._root, opts.id);
    this._root = this._findAndUpdate(
      this._root,
      opts.targetGroupId,
      (filters) => {
        const newFilters = [...filters];
        newFilters.splice(opts.index, 0, filter);
        return newFilters;
      },
    );
    this._notify();
  };

  groupFilters = (
    opts: { ids?: string[]; operator?: FilterOperator; groupId?: string } = {},
  ): string => {
    const ids = opts.ids ?? [];
    const operator = opts.operator ?? "and";
    const targetGroupId = opts.groupId ?? this._root.id;

    if (opts.groupId) {
      const parent = this._findById(opts.groupId);
      if (!parent) error(`Parent with id "${opts.groupId}" not found`);
      if (!isGroup(parent)) error(`Parent "${opts.groupId}" is not a group`);
    }

    const filters: FilterExpression<Schema>[] = [];

    for (const id of ids) {
      if (id === this._root.id) error("Cannot group root");
      const filter = this._findById(id);
      if (!filter) error(`Filter with id "${id}" not found`);
      filters.push(filter);
    }

    for (const id of ids) {
      this._root = this._removeFromTree(this._root, id);
    }

    const newGroup: Group<Schema> = {
      type: "group",
      id: generateId(),
      operator,
      filters,
    };

    this._root = this._findAndUpdate(this._root, targetGroupId, (existing) => [
      ...existing,
      newGroup,
    ]);

    this._notify();
    return newGroup.id;
  };

  ungroupFilter = (opts: { id: string }): void => {
    if (opts.id === this._root.id) error("Cannot ungroup root");
    const group = this._findById(opts.id);
    if (!group) error(`Group with id "${opts.id}" not found`);
    if (!isGroup(group)) error(`Cannot ungroup: "${opts.id}" is not a group`);

    const groupId = this._findParentId(opts.id);
    if (!groupId) error(`Parent not found for group "${opts.id}"`);

    const children = group.filters;

    this._root = this._removeFromTree(this._root, opts.id);
    this._root = this._findAndUpdate(this._root, groupId, (filters) => [
      ...filters,
      ...children,
    ]);

    this._notify();
  };

  setFilter = (input: GroupInput<Schema>): void => {
    this._root = hydrateGroup(input, true);
    this._notify();
  };

  resetFilter = (): void => {
    this._root = this._defaultFilter
      ? hydrateGroup(this._defaultFilter, true)
      : createEmptyRoot();
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
