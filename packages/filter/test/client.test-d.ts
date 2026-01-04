import { describe, expectTypeOf, it } from "vitest";
import { createFilterStore, type FilterStore } from "../src/filter-client";
import {
  booleanFilter,
  numberFilter,
  stringFilter,
  type FilterInput,
} from "../src/index";
import type { FilterDefinitions, FilterStoreOptions } from "../src/types";

const schema = {
  name: stringFilter({ operators: ["eq", "contains"] }),
  age: numberFilter({ operators: ["gt", "lt"] }),
  active: booleanFilter(),
} as const;

type TestSchema = typeof schema;

describe("FilterStore types", () => {
  it("should infer correct filter input types", () => {
    const store = createFilterStore({ definitions: schema });

    expectTypeOf(store.filters).toEqualTypeOf<FilterInput<TestSchema>>();
    expectTypeOf(store.getFilters()).toEqualTypeOf<FilterInput<TestSchema>>();
  });

  it("should type setFilter key parameter correctly", () => {
    const store = createFilterStore({ definitions: schema });

    store.setFilter("name", { operator: "eq", value: "test" });
    store.setFilter("age", { operator: "gt", value: 18 });
    store.setFilter("active", true);

    // @ts-expect-error - invalid key
    store.setFilter("invalid", "value");
  });

  it("should type setFilter value parameter correctly for filters with operators", () => {
    const store = createFilterStore({ definitions: schema });

    store.setFilter("name", { operator: "eq", value: "test" });
    store.setFilter("name", { operator: "contains", value: "test" });

    // @ts-expect-error - invalid operator
    store.setFilter("name", { operator: "invalid", value: "test" });

    // @ts-expect-error - wrong value type
    store.setFilter("name", { operator: "eq", value: 123 });
  });

  it("should type setFilter value parameter correctly for filters without operators", () => {
    const store = createFilterStore({ definitions: schema });

    store.setFilter("active", true);
    store.setFilter("active", false);

    // @ts-expect-error - wrong value type
    store.setFilter("active", "true");

    // @ts-expect-error - wrong value type
    store.setFilter("active", { operator: "eq", value: true });
  });

  it("should type setFilters correctly", () => {
    const store = createFilterStore({ definitions: schema });

    store.setFilters({
      name: { operator: "eq", value: "test" },
      age: { operator: "gt", value: 18 },
      active: true,
    });

    store.setFilters({});

    // @ts-expect-error - invalid filter key
    store.setFilters({ invalid: "value" });
  });

  it("should type setFilters updater function correctly", () => {
    const store = createFilterStore({ definitions: schema });

    store.setFilters((prev) => {
      expectTypeOf(prev).toEqualTypeOf<FilterInput<TestSchema>>();
      return { ...prev, active: true };
    });
  });

  it("should type defaultFilters correctly", () => {
    createFilterStore({
      definitions: schema,
      defaultFilters: {
        name: { operator: "eq", value: "default" },
      },
    });

    createFilterStore({
      definitions: schema,
      // @ts-expect-error - invalid default filter
      defaultFilters: { invalid: "value" },
    });
  });

  it("should type onFilterChange callback correctly", () => {
    createFilterStore({
      definitions: schema,
      onFilterChange: (filters) => {
        expectTypeOf(filters).toEqualTypeOf<FilterInput<TestSchema>>();
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
});

describe("FilterStoreOptions types", () => {
  it("should accept valid options", () => {
    const options: FilterStoreOptions<TestSchema> = {
      definitions: schema,
      defaultFilters: { active: true },
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
