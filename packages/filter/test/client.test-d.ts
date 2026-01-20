import { describe, expectTypeOf, it } from "vitest";
import { createFilterStore, type FilterStore } from "../src/filter-client";
import { booleanFilter, numberFilter, stringFilter } from "../src/index";
import type {
  Condition,
  FilterDefinitions,
  FilterExpression,
  FilterStoreOptions,
  Group,
  GroupInput,
} from "../src/types";

const schema = {
  name: stringFilter({ operators: ["eq", "contains"] }),
  age: numberFilter({ operators: ["gt", "lt"] }),
  active: booleanFilter(),
} as const;

type TestSchema = typeof schema;

describe("FilterStore types", () => {
  it("should infer correct filter type", () => {
    const store = createFilterStore({ definitions: schema });

    expectTypeOf(store.filter).toEqualTypeOf<Group<TestSchema>>();
    expectTypeOf(store.getFilter()).toEqualTypeOf<Group<TestSchema>>();
  });

  it("should type getFilterById correctly", () => {
    const store = createFilterStore({ definitions: schema });

    expectTypeOf(store.getFilterById("id")).toEqualTypeOf<
      FilterExpression<TestSchema> | undefined
    >();
  });

  it("should type addCondition field parameter correctly", () => {
    const store = createFilterStore({ definitions: schema });

    store.addCondition({
      field: "name",
      value: { operator: "eq", value: "test" },
    });
    store.addCondition({ field: "age", value: { operator: "gt", value: 18 } });
    store.addCondition({ field: "active", value: true });

    // @ts-expect-error - invalid field
    store.addCondition({ field: "invalid", value: "value" });
  });

  it("should type addCondition value parameter correctly for filters with operators", () => {
    const store = createFilterStore({ definitions: schema });

    store.addCondition({
      field: "name",
      value: { operator: "eq", value: "test" },
    });
    store.addCondition({
      field: "name",
      value: { operator: "contains", value: "test" },
    });

    store.addCondition({
      field: "name",
      // @ts-expect-error - invalid operator
      value: { operator: "invalid", value: "test" },
    });

    store.addCondition({
      field: "name",
      // @ts-expect-error - wrong value type
      value: { operator: "eq", value: 123 },
    });
  });

  it("should type addCondition value parameter correctly for filters without operators", () => {
    const store = createFilterStore({ definitions: schema });

    store.addCondition({ field: "active", value: true });
    store.addCondition({ field: "active", value: false });

    // @ts-expect-error - wrong value type
    store.addCondition({ field: "active", value: "true" });

    store.addCondition({
      field: "active",
      // @ts-expect-error - wrong value type
      value: { operator: "eq", value: true },
    });
  });

  it("should type updateCondition correctly", () => {
    const store = createFilterStore({ definitions: schema });
    const id = store.addCondition({
      field: "name",
      value: { operator: "eq", value: "test" },
    });

    store.updateCondition({
      id,
      value: { operator: "contains", value: "new" },
    });
  });

  it("should type addGroup correctly", () => {
    const store = createFilterStore({ definitions: schema });

    const groupId = store.addGroup({ operator: "and" });
    expectTypeOf(groupId).toEqualTypeOf<string>();

    store.addGroup({ operator: "or" });
    store.addGroup({ operator: "and", groupId });

    // @ts-expect-error - invalid operator
    store.addGroup({ operator: "xor" });
  });

  it("should type setOperator correctly", () => {
    const store = createFilterStore({ definitions: schema });
    const groupId = store.addGroup({ operator: "and" });

    store.setOperator({ id: groupId, operator: "or" });

    // @ts-expect-error - invalid operator
    store.setOperator({ id: groupId, operator: "xor" });
  });

  it("should type setFilter correctly", () => {
    const store = createFilterStore({ definitions: schema });

    store.setFilter({
      type: "group",
      operator: "and",
      filters: [
        {
          type: "condition",
          field: "name",
          value: { operator: "eq", value: "test" },
        },
        { type: "condition", field: "active", value: true },
      ],
    });

    store.setFilter({
      type: "group",
      operator: "or",
      filters: [
        {
          type: "group",
          operator: "and",
          filters: [
            {
              type: "condition",
              field: "age",
              value: { operator: "gt", value: 18 },
            },
          ],
        },
      ],
    });

    store.setFilter({
      type: "group",
      operator: "and",
      // @ts-expect-error - invalid field
      filters: [{ type: "condition", field: "invalid", value: "value" }],
    });
  });

  it("should type defaultFilter correctly", () => {
    createFilterStore({
      definitions: schema,
      defaultFilter: {
        type: "group",
        operator: "and",
        filters: [
          {
            type: "condition",
            field: "name",
            value: { operator: "eq", value: "default" },
          },
        ],
      },
    });

    createFilterStore({
      definitions: schema,
      defaultFilter: {
        type: "group",
        operator: "and",
        // @ts-expect-error - invalid filter field
        filters: [{ type: "condition", field: "invalid", value: "value" }],
      },
    });
  });

  it("should type onFilterChange callback correctly", () => {
    createFilterStore({
      definitions: schema,
      onFilterChange: (filter) => {
        expectTypeOf(filter).toEqualTypeOf<Group<TestSchema>>();
      },
    });
  });

  it("should type definitions getter correctly", () => {
    const store = createFilterStore({ definitions: schema });

    expectTypeOf(store.definitions).toEqualTypeOf<
      FilterDefinitions<TestSchema>
    >();
  });

  it("should type subscribe correctly", () => {
    const store = createFilterStore({ definitions: schema });

    const unsubscribe = store.subscribe(() => {});
    expectTypeOf(unsubscribe).toEqualTypeOf<() => void>();
  });

  it("should type groupFilters correctly", () => {
    const store = createFilterStore({ definitions: schema });
    const id1 = store.addCondition({ field: "active", value: true });
    const id2 = store.addCondition({ field: "active", value: false });

    const newGroupId = store.groupFilters({ ids: [id1, id2], operator: "or" });
    expectTypeOf(newGroupId).toEqualTypeOf<string>();
  });

  it("should type moveFilter correctly", () => {
    const store = createFilterStore({ definitions: schema });
    const conditionId = store.addCondition({ field: "active", value: true });
    const groupId = store.addGroup({ operator: "or" });

    store.moveFilter({ id: conditionId, targetGroupId: groupId, index: 0 });
  });

  it("should type getParentId correctly", () => {
    const store = createFilterStore({ definitions: schema });
    const id = store.addCondition({ field: "active", value: true });

    expectTypeOf(store.getParentId(id)).toEqualTypeOf<string | undefined>();
  });
});

describe("FilterStoreOptions types", () => {
  it("should accept valid options", () => {
    const options: FilterStoreOptions<TestSchema> = {
      definitions: schema,
      defaultFilter: {
        type: "group",
        operator: "and",
        filters: [{ type: "condition", field: "active", value: true }],
      },
      onFilterChange: () => {},
    };

    expectTypeOf(options).toMatchTypeOf<FilterStoreOptions<TestSchema>>();
  });
});

describe("FilterStore class type", () => {
  it("should be properly typed", () => {
    const store = createFilterStore({ definitions: schema });

    expectTypeOf(store).toMatchTypeOf<FilterStore<TestSchema>>();
  });
});

describe("Group and Condition types", () => {
  it("should type Group correctly", () => {
    const group: Group<TestSchema> = {
      type: "group",
      id: "1",
      operator: "and",
      filters: [],
    };

    expectTypeOf(group.id).toEqualTypeOf<string>();
    expectTypeOf(group.operator).toEqualTypeOf<"and" | "or">();
    expectTypeOf(group.filters).toEqualTypeOf<FilterExpression<TestSchema>[]>();
  });

  it("should type Condition correctly", () => {
    const condition: Condition<TestSchema> = {
      type: "condition",
      id: "1",
      field: "name",
      value: { operator: "eq", value: "test" },
    };

    expectTypeOf(condition.id).toEqualTypeOf<string>();
  });

  it("should type GroupInput correctly", () => {
    const input: GroupInput<TestSchema> = {
      type: "group",
      operator: "or",
      filters: [
        { type: "condition", field: "active", value: true },
        {
          type: "group",
          operator: "and",
          filters: [
            {
              type: "condition",
              field: "name",
              value: { operator: "eq", value: "test" },
            },
          ],
        },
      ],
    };

    expectTypeOf(input).toMatchTypeOf<GroupInput<TestSchema>>();
  });
});
