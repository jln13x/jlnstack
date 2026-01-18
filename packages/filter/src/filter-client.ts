import { createStore } from "@jlnstack/store";
import { immer } from "@jlnstack/store/plugins/immer";
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

function error(message: string): never {
  throw new Error(message);
}

// Helper functions for tree operations (work with immer drafts)
function findById<Schema extends FilterSchemaConstraint>(
  root: Group<Schema>,
  id: string,
): FilterExpression<Schema> | undefined {
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
  return search(root);
}

function findParentId<Schema extends FilterSchemaConstraint>(
  root: Group<Schema>,
  id: string,
): string | undefined {
  const search = (
    filter: FilterExpression<Schema>,
    parentId: string | undefined,
  ): string | undefined => {
    if (filter.id === id) return parentId;
    if (isGroup(filter)) {
      for (const child of filter.filters) {
        const found = search(child, filter.id);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };
  return search(root, undefined);
}

function removeFromTree<Schema extends FilterSchemaConstraint>(
  group: Group<Schema>,
  targetId: string,
): void {
  group.filters = group.filters.filter((f) => f.id !== targetId);
  for (const filter of group.filters) {
    if (isGroup(filter)) {
      removeFromTree(filter, targetId);
    }
  }
}

function isDescendant<Schema extends FilterSchemaConstraint>(
  root: Group<Schema>,
  ancestorId: string,
  nodeId: string,
): boolean {
  let current: string | undefined = nodeId;
  while (current) {
    if (current === ancestorId) return true;
    current = findParentId(root, current);
  }
  return false;
}

function createFilterStore<Schema extends FilterSchemaConstraint>(
  options: FilterStoreOptions<Schema>,
) {
  const idPrefix = options.idPrefix ?? "f";
  let idCounter = 0;

  const generateId = () => `${idPrefix}-${idCounter++}`;

  const hydrateFilter = (
    input: FilterExpressionInput<Schema>,
  ): FilterExpression<Schema> => {
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
  };

  const hydrateGroup = (
    input: GroupInput<Schema>,
    isRoot = false,
  ): Group<Schema> => ({
    type: "group",
    id: generateId(),
    operator: input.operator,
    filters: input.filters.map((f) => hydrateFilter(f)),
    ...(isRoot && { root: true }),
  });

  const createEmptyRoot = (): Group<Schema> => ({
    type: "group",
    id: generateId(),
    operator: "and",
    filters: [],
    root: true,
  });

  const initialRoot = options.defaultFilter
    ? hydrateGroup(options.defaultFilter, true)
    : createEmptyRoot();

  // Define actions factory with explicit state type for proper inference
  const createActions = (api: {
    getState: () => { root: Group<Schema> };
    setState: (
      updater: (state: { root: Group<Schema> }) => { root: Group<Schema> },
    ) => void;
  }) => ({
    addCondition: <K extends keyof Schema>(opts: {
      field: K;
      value: FilterValue<Schema[K]>;
      groupId?: string;
    }) => {
      const groupId = opts.groupId ?? api.getState().root.id;
      const conditionId = generateId();

      api.setState((draft) => {
        const group = findById(draft.root, groupId);
        if (!group || !isGroup(group)) {
          error(`Group with id "${groupId}" not found`);
        }
        group.filters.push({
          type: "condition",
          id: conditionId,
          field: opts.field,
          value: opts.value,
        } as Condition<Schema>);
        return draft;
      });

      options.onFilterChange?.(api.getState().root);
      return conditionId;
    },

    addGroup: (opts: { operator: FilterOperator; groupId?: string }) => {
      const targetGroupId = opts.groupId ?? api.getState().root.id;
      const newGroupId = generateId();

      api.setState((draft) => {
        const group = findById(draft.root, targetGroupId);
        if (!group || !isGroup(group)) {
          error(`Group with id "${targetGroupId}" not found`);
        }
        group.filters.push({
          type: "group",
          id: newGroupId,
          operator: opts.operator,
          filters: [],
        } as Group<Schema>);
        return draft;
      });

      options.onFilterChange?.(api.getState().root);
      return newGroupId;
    },

    updateCondition: <K extends keyof Schema>(opts: {
      id: string;
      value: FilterValue<Schema[K]>;
    }) => {
      const existing = findById(api.getState().root, opts.id);
      if (!existing) error(`Condition with id "${opts.id}" not found`);
      if (isGroup(existing)) {
        error(`Cannot update condition: "${opts.id}" is a group`);
      }

      api.setState((draft) => {
        const condition = findById(draft.root, opts.id);
        if (condition && !isGroup(condition)) {
          (condition as Condition<Schema>).value = opts.value;
        }
        return draft;
      });

      options.onFilterChange?.(api.getState().root);
    },

    setOperator: (opts: { id: string; operator: FilterOperator }) => {
      const existing = findById(api.getState().root, opts.id);
      if (!existing) error(`Group with id "${opts.id}" not found`);
      if (!isGroup(existing)) {
        error(`Cannot set operator: "${opts.id}" is not a group`);
      }

      api.setState((draft) => {
        const group = findById(draft.root, opts.id);
        if (group && isGroup(group)) {
          group.operator = opts.operator;
        }
        return draft;
      });

      options.onFilterChange?.(api.getState().root);
    },

    removeFilter: (opts: { id: string }) => {
      const root = api.getState().root;
      if (opts.id === root.id) error("Cannot remove root group");
      const existing = findById(root, opts.id);
      if (!existing) error(`Filter with id "${opts.id}" not found`);

      api.setState((draft) => {
        removeFromTree(draft.root, opts.id);
        return draft;
      });

      options.onFilterChange?.(api.getState().root);
    },

    moveFilter: (opts: {
      id: string;
      targetGroupId: string;
      index: number;
    }) => {
      const root = api.getState().root;
      if (opts.id === root.id) error("Cannot move root group");
      if (isDescendant(root, opts.id, opts.targetGroupId)) {
        error(
          `Cannot move filter into its own descendant "${opts.targetGroupId}"`,
        );
      }
      const filter = findById(root, opts.id);
      if (!filter) error(`Filter with id "${opts.id}" not found`);
      const targetGroup = findById(root, opts.targetGroupId);
      if (!targetGroup) {
        error(`Target group with id "${opts.targetGroupId}" not found`);
      }
      if (!isGroup(targetGroup)) {
        error(`Target group "${opts.targetGroupId}" is not a group`);
      }

      api.setState((draft) => {
        const filterToMove = findById(draft.root, opts.id);
        if (!filterToMove) return draft;

        removeFromTree(draft.root, opts.id);

        const target = findById(draft.root, opts.targetGroupId);
        if (target && isGroup(target)) {
          target.filters.splice(opts.index, 0, filterToMove);
        }
        return draft;
      });

      options.onFilterChange?.(api.getState().root);
    },

    groupFilters: (
      opts: {
        ids?: string[];
        operator?: FilterOperator;
        groupId?: string;
      } = {},
    ) => {
      const ids = opts.ids ?? [];
      const operator = opts.operator ?? "and";
      const targetGroupId = opts.groupId ?? api.getState().root.id;
      const root = api.getState().root;

      if (opts.groupId) {
        const parent = findById(root, opts.groupId);
        if (!parent) error(`Parent with id "${opts.groupId}" not found`);
        if (!isGroup(parent)) error(`Parent "${opts.groupId}" is not a group`);
      }

      for (const id of ids) {
        if (id === root.id) error("Cannot group root");
        const filter = findById(root, id);
        if (!filter) error(`Filter with id "${id}" not found`);
        if (opts.groupId && isDescendant(root, id, opts.groupId)) {
          error(`Cannot group into descendant "${opts.groupId}"`);
        }
      }

      const newGroupId = generateId();

      api.setState((draft) => {
        const collected: FilterExpression<Schema>[] = [];
        for (const id of ids) {
          const filter = findById(draft.root, id);
          if (filter) collected.push(filter);
        }

        for (const id of ids) {
          removeFromTree(draft.root, id);
        }

        const target = findById(draft.root, targetGroupId);
        if (target && isGroup(target)) {
          target.filters.push({
            type: "group",
            id: newGroupId,
            operator,
            filters: collected,
          } as Group<Schema>);
        }
        return draft;
      });

      options.onFilterChange?.(api.getState().root);
      return newGroupId;
    },

    ungroupFilter: (opts: { id: string }) => {
      const root = api.getState().root;
      if (opts.id === root.id) error("Cannot ungroup root");
      const group = findById(root, opts.id);
      if (!group) error(`Group with id "${opts.id}" not found`);
      if (!isGroup(group)) error(`Cannot ungroup: "${opts.id}" is not a group`);

      const parentId = findParentId(root, opts.id);
      if (!parentId) error(`Parent not found for group "${opts.id}"`);

      api.setState((draft) => {
        const groupToUngroup = findById(draft.root, opts.id);
        if (!groupToUngroup || !isGroup(groupToUngroup)) return draft;

        const children = [...groupToUngroup.filters];
        removeFromTree(draft.root, opts.id);

        const parent = findById(draft.root, parentId);
        if (parent && isGroup(parent)) {
          parent.filters.push(...children);
        }
        return draft;
      });

      options.onFilterChange?.(api.getState().root);
    },

    setFilter: (input: GroupInput<Schema>) => {
      api.setState((draft) => {
        draft.root = hydrateGroup(input, true);
        return draft;
      });
      options.onFilterChange?.(api.getState().root);
    },

    resetFilter: () => {
      api.setState((draft) => {
        draft.root = options.defaultFilter
          ? hydrateGroup(options.defaultFilter, true)
          : createEmptyRoot();
        return draft;
      });
      options.onFilterChange?.(api.getState().root);
    },
  });

  const store = createStore({
    state: { root: initialRoot },
    actions: createActions,
    plugins: [immer()],
  });

  return {
    get filter() {
      return store.store.getState().root;
    },
    get rootId() {
      return store.store.getState().root.id;
    },
    definitions: options.definitions as FilterDefinitions<Schema>,
    getFilter: () => store.store.getState().root,
    getFilterById: (id: string) => findById(store.store.getState().root, id),
    getParentId: (id: string) => findParentId(store.store.getState().root, id),
    subscribe: store.store.subscribe as (listener: Listener) => () => void,
    ...store.actions,
  };
}

type FilterStore<Schema extends FilterSchemaConstraint> = ReturnType<
  typeof createFilterStore<Schema>
>;

export { createFilterStore, type FilterStore };
