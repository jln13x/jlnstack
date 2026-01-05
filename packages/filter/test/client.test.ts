import { describe, expect, it, vi } from "vitest";
import { createFilterStore, type FilterStore } from "../src/filter-client";
import { booleanFilter, numberFilter, stringFilter } from "../src/index";
import { isGroup } from "../src/types";

const schema = {
  name: stringFilter({ operators: ["eq", "contains"] }),
  age: numberFilter({ operators: ["gt", "lt", "eq"] }),
  active: booleanFilter(),
};

type Schema = typeof schema;

describe("FilterStore", () => {
  const createStore = (
    options?: Partial<Parameters<typeof createFilterStore<Schema>>[0]>,
  ): FilterStore<Schema> =>
    createFilterStore<Schema>({ definitions: schema, ...options });

  describe("initialization", () => {
    it("should initialize with empty root group when no defaults provided", () => {
      const store = createStore();
      const filter = store.getFilter();

      expect(filter.type).toBe("group");
      expect(filter.operator).toBe("and");
      expect(filter.filters).toEqual([]);
      expect(filter.root).toBe(true);
      expect(filter.id).toBeDefined();
    });

    it("should initialize with default filter", () => {
      const store = createStore({
        defaultFilter: {
          type: "group",
          operator: "or",
          filters: [{ type: "condition", field: "active", value: true }],
        },
      });
      const filter = store.getFilter();

      expect(filter.operator).toBe("or");
      expect(filter.filters).toHaveLength(1);
      expect(filter.root).toBe(true);
    });

    it("should expose definitions", () => {
      const store = createStore();
      expect(store.definitions).toBe(schema);
    });

    it("should expose filter getter", () => {
      const store = createStore();
      expect(store.filter).toEqual(store.getFilter());
    });
  });

  describe("addCondition", () => {
    it("should add condition to root group", () => {
      const store = createStore();

      const id = store.addCondition({
        field: "name",
        value: { operator: "eq", value: "John" },
      });

      const filter = store.getFilter();
      expect(filter.filters).toHaveLength(1);
      expect(filter.filters[0]).toMatchObject({
        type: "condition",
        id,
        field: "name",
        value: { operator: "eq", value: "John" },
      });
    });

    it("should add condition to specific parent", () => {
      const store = createStore();
      const groupId = store.addGroup({ operator: "or" });

      store.addCondition({
        field: "active",
        value: true,
        groupId,
      });

      const group = store.getFilterById(groupId);
      expect(group).toBeDefined();
      expect(isGroup(group!)).toBe(true);
      if (isGroup(group!)) {
        expect(group.filters).toHaveLength(1);
        expect(group.filters[0]).toMatchObject({
          field: "active",
          value: true,
        });
      }
    });

    it("should return the condition id", () => {
      const store = createStore();
      const id = store.addCondition({
        field: "age",
        value: { operator: "gt", value: 18 },
      });

      expect(typeof id).toBe("string");
      expect(store.getFilterById(id)).toBeDefined();
    });
  });

  describe("addGroup", () => {
    it("should add group to root", () => {
      const store = createStore();

      const groupId = store.addGroup({ operator: "or" });

      const filter = store.getFilter();
      expect(filter.filters).toHaveLength(1);
      const group = filter.filters[0] as (typeof filter.filters)[number];
      expect(isGroup(group)).toBe(true);
      if (isGroup(group)) {
        expect(group.id).toBe(groupId);
        expect(group.operator).toBe("or");
        expect(group.filters).toEqual([]);
      }
    });

    it("should add nested group", () => {
      const store = createStore();
      const parentId = store.addGroup({ operator: "and" });

      const childId = store.addGroup({ operator: "or", groupId: parentId });

      const parent = store.getFilterById(parentId);
      expect(parent).toBeDefined();
      expect(isGroup(parent!)).toBe(true);
      if (isGroup(parent!)) {
        expect(parent.filters).toHaveLength(1);
        expect(parent.filters[0]).toMatchObject({
          id: childId,
          operator: "or",
        });
      }
    });
  });

  describe("updateCondition", () => {
    it("should update condition value", () => {
      const store = createStore();
      const id = store.addCondition({
        field: "name",
        value: { operator: "eq", value: "old" },
      });

      store.updateCondition({
        id,
        value: { operator: "contains", value: "new" },
      });

      const condition = store.getFilterById(id);
      expect(condition).toMatchObject({
        value: { operator: "contains", value: "new" },
      });
    });

    it("should throw when condition not found", () => {
      const store = createStore();

      expect(() =>
        store.updateCondition({
          id: "nonexistent",
          value: { operator: "eq", value: "test" },
        }),
      ).toThrow('Condition with id "nonexistent" not found');
    });

    it("should throw when trying to update a group", () => {
      const store = createStore();
      const groupId = store.addGroup({ operator: "or" });

      expect(() =>
        store.updateCondition({
          id: groupId,
          value: { operator: "eq", value: "test" },
        }),
      ).toThrow("is a group");
    });
  });

  describe("setOperator", () => {
    it("should update group operator", () => {
      const store = createStore();
      const groupId = store.addGroup({ operator: "and" });

      store.setOperator({ id: groupId, operator: "or" });

      const group = store.getFilterById(groupId);
      expect(group).toBeDefined();
      expect(isGroup(group!)).toBe(true);
      if (isGroup(group!)) {
        expect(group.operator).toBe("or");
      }
    });

    it("should update root operator", () => {
      const store = createStore();
      const rootId = store.getFilter().id;

      store.setOperator({ id: rootId, operator: "or" });

      expect(store.getFilter().operator).toBe("or");
    });

    it("should throw when group not found", () => {
      const store = createStore();

      expect(() =>
        store.setOperator({ id: "nonexistent", operator: "or" }),
      ).toThrow('Group with id "nonexistent" not found');
    });

    it("should throw when trying to set operator on condition", () => {
      const store = createStore();
      const conditionId = store.addCondition({
        field: "active",
        value: true,
      });

      expect(() =>
        store.setOperator({ id: conditionId, operator: "or" }),
      ).toThrow("is not a group");
    });
  });

  describe("removeFilter", () => {
    it("should remove condition", () => {
      const store = createStore();
      const id = store.addCondition({ field: "active", value: true });

      store.removeFilter({ id });

      expect(store.getFilterById(id)).toBeUndefined();
      expect(store.getFilter().filters).toHaveLength(0);
    });

    it("should remove group with children", () => {
      const store = createStore();
      const groupId = store.addGroup({ operator: "or" });
      store.addCondition({ field: "active", value: true, groupId });

      store.removeFilter({ id: groupId });

      expect(store.getFilterById(groupId)).toBeUndefined();
      expect(store.getFilter().filters).toHaveLength(0);
    });

    it("should throw when trying to remove root", () => {
      const store = createStore();
      const rootId = store.getFilter().id;

      expect(() => store.removeFilter({ id: rootId })).toThrow(
        "Cannot remove root group",
      );
    });

    it("should throw when filter not found", () => {
      const store = createStore();

      expect(() => store.removeFilter({ id: "nonexistent" })).toThrow(
        'Filter with id "nonexistent" not found',
      );
    });
  });

  describe("moveFilter", () => {
    it("should move condition to different parent", () => {
      const store = createStore();
      const conditionId = store.addCondition({
        field: "active",
        value: true,
      });
      const groupId = store.addGroup({ operator: "or" });

      store.moveFilter({ id: conditionId, targetGroupId: groupId, index: 0 });

      const group = store.getFilterById(groupId);
      expect(group).toBeDefined();
      expect(isGroup(group!)).toBe(true);
      if (isGroup(group!)) {
        expect(group.filters).toHaveLength(1);
        expect(group.filters[0]).toMatchObject({ id: conditionId });
      }
      expect(store.getFilter().filters).toHaveLength(1);
    });

    it("should insert at specific index", () => {
      const store = createStore();
      const id1 = store.addCondition({ field: "active", value: true });
      const id2 = store.addCondition({ field: "active", value: false });
      const groupId = store.addGroup({ operator: "or" });

      store.moveFilter({ id: id1, targetGroupId: groupId, index: 0 });
      store.moveFilter({ id: id2, targetGroupId: groupId, index: 0 });

      const group = store.getFilterById(groupId);
      expect(group).toBeDefined();
      if (isGroup(group!)) {
        expect(group.filters[0]).toMatchObject({ id: id2 });
        expect(group.filters[1]).toMatchObject({ id: id1 });
      }
    });

    it("should throw when moving root", () => {
      const store = createStore();
      const groupId = store.addGroup({ operator: "or" });
      const rootId = store.getFilter().id;

      expect(() =>
        store.moveFilter({ id: rootId, targetGroupId: groupId, index: 0 }),
      ).toThrow("Cannot move root group");
    });
  });

  describe("groupFilters", () => {
    it("should group conditions into new group", () => {
      const store = createStore();
      const id1 = store.addCondition({ field: "active", value: true });
      const id2 = store.addCondition({
        field: "name",
        value: { operator: "eq", value: "John" },
      });

      const newGroupId = store.groupFilters({
        ids: [id1, id2],
        operator: "or",
      });

      const root = store.getFilter();
      expect(root.filters).toHaveLength(1);

      const newGroup = store.getFilterById(newGroupId);
      expect(newGroup).toBeDefined();
      expect(isGroup(newGroup!)).toBe(true);
      if (isGroup(newGroup!)) {
        expect(newGroup.operator).toBe("or");
        expect(newGroup.filters).toHaveLength(2);
      }
    });

    it("should group into specific parent", () => {
      const store = createStore();
      const parentId = store.addGroup({ operator: "and" });
      const id1 = store.addCondition({
        field: "active",
        value: true,
        groupId: parentId,
      });
      const id2 = store.addCondition({
        field: "active",
        value: false,
        groupId: parentId,
      });

      const newGroupId = store.groupFilters({
        ids: [id1, id2],
        operator: "or",
        groupId: parentId,
      });

      const parent = store.getFilterById(parentId);
      expect(parent).toBeDefined();
      if (isGroup(parent!)) {
        expect(parent.filters).toHaveLength(1);
        expect(parent.filters[0]).toMatchObject({ id: newGroupId });
      }
    });

    it("should create empty group when no ids provided", () => {
      const store = createStore();

      const groupId = store.groupFilters({ operator: "or" });

      const group = store.getFilterById(groupId);
      expect(group).toBeDefined();
      expect(isGroup(group!)).toBe(true);
      if (isGroup(group!)) {
        expect(group.operator).toBe("or");
        expect(group.filters).toEqual([]);
      }
    });

    it("should default to 'and' operator", () => {
      const store = createStore();

      const groupId = store.groupFilters({});

      const group = store.getFilterById(groupId);
      expect(group).toBeDefined();
      if (isGroup(group!)) {
        expect(group.operator).toBe("and");
      }
    });

    it("should throw when grouping root", () => {
      const store = createStore();
      const rootId = store.getFilter().id;

      expect(() => store.groupFilters({ ids: [rootId] })).toThrow(
        "Cannot group root",
      );
    });
  });

  describe("ungroupFilter", () => {
    it("should ungroup and move children to parent", () => {
      const store = createStore();
      const groupId = store.addGroup({ operator: "or" });
      const id1 = store.addCondition({
        field: "active",
        value: true,
        groupId,
      });
      const id2 = store.addCondition({
        field: "active",
        value: false,
        groupId,
      });

      store.ungroupFilter({ id: groupId });

      expect(store.getFilterById(groupId)).toBeUndefined();
      const root = store.getFilter();
      expect(root.filters).toHaveLength(2);
      expect(root.filters.map((f) => f.id)).toContain(id1);
      expect(root.filters.map((f) => f.id)).toContain(id2);
    });

    it("should throw when ungrouping root", () => {
      const store = createStore();
      const rootId = store.getFilter().id;

      expect(() => store.ungroupFilter({ id: rootId })).toThrow(
        "Cannot ungroup root",
      );
    });

    it("should throw when ungrouping condition", () => {
      const store = createStore();
      const conditionId = store.addCondition({ field: "active", value: true });

      expect(() => store.ungroupFilter({ id: conditionId })).toThrow(
        "is not a group",
      );
    });
  });

  describe("setFilter", () => {
    it("should replace entire filter tree", () => {
      const store = createStore();
      store.addCondition({ field: "active", value: true });

      store.setFilter({
        type: "group",
        operator: "or",
        filters: [
          {
            type: "condition",
            field: "name",
            value: { operator: "eq", value: "Jane" },
          },
          {
            type: "condition",
            field: "age",
            value: { operator: "gt", value: 21 },
          },
        ],
      });

      const filter = store.getFilter();
      expect(filter.operator).toBe("or");
      expect(filter.filters).toHaveLength(2);
      expect(filter.root).toBe(true);
    });
  });

  describe("resetFilter", () => {
    it("should reset to default filter", () => {
      const defaultFilter = {
        type: "group" as const,
        operator: "or" as const,
        filters: [
          {
            type: "condition" as const,
            field: "active" as const,
            value: false,
          },
        ],
      };
      const store = createStore({ defaultFilter });
      store.addCondition({
        field: "name",
        value: { operator: "eq", value: "test" },
      });

      store.resetFilter();

      const filter = store.getFilter();
      expect(filter.operator).toBe("or");
      expect(filter.filters).toHaveLength(1);
    });

    it("should reset to empty when no defaults", () => {
      const store = createStore();
      store.addCondition({ field: "active", value: true });

      store.resetFilter();

      expect(store.getFilter().filters).toEqual([]);
    });
  });

  describe("getParentId", () => {
    it("should return parent id of condition", () => {
      const store = createStore();
      const conditionId = store.addCondition({ field: "active", value: true });

      const parentId = store.getParentId(conditionId);

      expect(parentId).toBe(store.getFilter().id);
    });

    it("should return parent id of nested group", () => {
      const store = createStore();
      const groupId = store.addGroup({ operator: "or" });
      const childId = store.addCondition({
        field: "active",
        value: true,
        groupId,
      });

      expect(store.getParentId(childId)).toBe(groupId);
      expect(store.getParentId(groupId)).toBe(store.getFilter().id);
    });

    it("should return undefined for root", () => {
      const store = createStore();
      const rootId = store.getFilter().id;

      expect(store.getParentId(rootId)).toBeUndefined();
    });
  });

  describe("onFilterChange callback", () => {
    it("should call onFilterChange when addCondition is called", () => {
      const onFilterChange = vi.fn();
      const store = createStore({ onFilterChange });

      store.addCondition({
        field: "name",
        value: { operator: "eq", value: "test" },
      });

      expect(onFilterChange).toHaveBeenCalledOnce();
      expect(onFilterChange).toHaveBeenCalledWith(store.getFilter());
    });

    it("should call onFilterChange when addGroup is called", () => {
      const onFilterChange = vi.fn();
      const store = createStore({ onFilterChange });

      store.addGroup({ operator: "or" });

      expect(onFilterChange).toHaveBeenCalledOnce();
    });

    it("should call onFilterChange when updateCondition is called", () => {
      const onFilterChange = vi.fn();
      const store = createStore({ onFilterChange });
      const id = store.addCondition({
        field: "active",
        value: true,
      });
      onFilterChange.mockClear();

      store.updateCondition({ id, value: false });

      expect(onFilterChange).toHaveBeenCalledOnce();
    });

    it("should call onFilterChange when removeFilter is called", () => {
      const onFilterChange = vi.fn();
      const store = createStore({ onFilterChange });
      const id = store.addCondition({ field: "active", value: true });
      onFilterChange.mockClear();

      store.removeFilter({ id });

      expect(onFilterChange).toHaveBeenCalledOnce();
    });

    it("should call onFilterChange when resetFilter is called", () => {
      const onFilterChange = vi.fn();
      const store = createStore({ onFilterChange });
      store.addCondition({ field: "active", value: true });
      onFilterChange.mockClear();

      store.resetFilter();

      expect(onFilterChange).toHaveBeenCalledOnce();
    });
  });

  describe("subscribe", () => {
    it("should notify listeners when filter changes", () => {
      const store = createStore();
      const listener = vi.fn();

      store.subscribe(listener);
      store.addCondition({ field: "active", value: true });

      expect(listener).toHaveBeenCalledOnce();
    });

    it("should notify multiple listeners", () => {
      const store = createStore();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      store.subscribe(listener1);
      store.subscribe(listener2);
      store.addGroup({ operator: "or" });

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
    });

    it("should return unsubscribe function", () => {
      const store = createStore();
      const listener = vi.fn();

      const unsubscribe = store.subscribe(listener);
      unsubscribe();
      store.addCondition({ field: "active", value: true });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should only unsubscribe the specific listener", () => {
      const store = createStore();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = store.subscribe(listener1);
      store.subscribe(listener2);

      unsubscribe1();
      store.addCondition({ field: "active", value: true });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledOnce();
    });
  });
});
