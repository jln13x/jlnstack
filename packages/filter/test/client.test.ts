import { describe, expect, it, vi } from "vitest";
import { createFilterStore, type FilterStore } from "../src/filter-client";
import { booleanFilter, numberFilter, stringFilter } from "../src/index";

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
    it("should initialize with empty filters when no defaults provided", () => {
      const store = createStore();

      expect(store.filters).toEqual({});
      expect(store.getFilters()).toEqual({});
    });

    it("should initialize with default filters", () => {
      const defaultFilters = {
        name: { operator: "eq" as const, value: "John" },
        active: true,
      };

      const store = createStore({ defaultFilters });

      expect(store.filters).toEqual(defaultFilters);
    });

    it("should expose definitions", () => {
      const store = createStore();

      expect(store.definitions).toBe(schema);
    });
  });

  describe("setFilters", () => {
    it("should set filters with object", () => {
      const store = createStore();

      store.setFilters({
        name: { operator: "contains", value: "test" },
      });

      expect(store.filters).toEqual({
        name: { operator: "contains", value: "test" },
      });
    });

    it("should set filters with updater function", () => {
      const store = createStore({ defaultFilters: { active: true } });

      store.setFilters((prev) => ({
        ...prev,
        name: { operator: "eq", value: "Jane" },
      }));

      expect(store.filters).toEqual({
        active: true,
        name: { operator: "eq", value: "Jane" },
      });
    });

    it("should replace all filters when setting new object", () => {
      const store = createStore({
        defaultFilters: {
          name: { operator: "eq", value: "John" },
          active: true,
        },
      });

      store.setFilters({ age: { operator: "gt", value: 18 } });

      expect(store.filters).toEqual({
        age: { operator: "gt", value: 18 },
      });
    });
  });

  describe("setFilter", () => {
    it("should set a single filter", () => {
      const store = createStore();

      store.setFilter("name", { operator: "eq", value: "Alice" });

      expect(store.filters).toEqual({
        name: { operator: "eq", value: "Alice" },
      });
    });

    it("should preserve other filters when setting single filter", () => {
      const store = createStore({ defaultFilters: { active: true } });

      store.setFilter("name", { operator: "contains", value: "test" });

      expect(store.filters).toEqual({
        active: true,
        name: { operator: "contains", value: "test" },
      });
    });

    it("should overwrite existing filter value", () => {
      const store = createStore({
        defaultFilters: { name: { operator: "eq", value: "old" } },
      });

      store.setFilter("name", { operator: "contains", value: "new" });

      expect(store.filters.name).toEqual({
        operator: "contains",
        value: "new",
      });
    });
  });

  describe("resetFilters", () => {
    it("should reset to default filters", () => {
      const defaultFilters = { active: false };
      const store = createStore({ defaultFilters });

      store.setFilters({
        name: { operator: "eq", value: "test" },
        age: { operator: "gt", value: 21 },
      });
      store.resetFilters();

      expect(store.filters).toEqual(defaultFilters);
    });

    it("should reset to empty when no defaults provided", () => {
      const store = createStore();

      store.setFilters({ active: true });
      store.resetFilters();

      expect(store.filters).toEqual({});
    });
  });

  describe("onFilterChange callback", () => {
    it("should call onFilterChange when setFilters is called", () => {
      const onFilterChange = vi.fn();
      const store = createStore({ onFilterChange });

      const newFilters = { name: { operator: "eq" as const, value: "test" } };
      store.setFilters(newFilters);

      expect(onFilterChange).toHaveBeenCalledOnce();
      expect(onFilterChange).toHaveBeenCalledWith(newFilters);
    });

    it("should call onFilterChange when setFilter is called", () => {
      const onFilterChange = vi.fn();
      const store = createStore({ onFilterChange });

      store.setFilter("active", true);

      expect(onFilterChange).toHaveBeenCalledOnce();
      expect(onFilterChange).toHaveBeenCalledWith({ active: true });
    });

    it("should call onFilterChange when resetFilters is called", () => {
      const onFilterChange = vi.fn();
      const defaultFilters = { active: true };
      const store = createStore({ defaultFilters, onFilterChange });

      store.setFilters({ name: { operator: "eq", value: "test" } });
      onFilterChange.mockClear();

      store.resetFilters();

      expect(onFilterChange).toHaveBeenCalledOnce();
      expect(onFilterChange).toHaveBeenCalledWith(defaultFilters);
    });
  });

  describe("subscribe", () => {
    it("should notify listeners when filters change via setFilters", () => {
      const store = createStore();
      const listener = vi.fn();

      store.subscribe(listener);
      store.setFilters({ active: true });

      expect(listener).toHaveBeenCalledOnce();
    });

    it("should notify listeners when filters change via setFilter", () => {
      const store = createStore();
      const listener = vi.fn();

      store.subscribe(listener);
      store.setFilter("active", false);

      expect(listener).toHaveBeenCalledOnce();
    });

    it("should notify listeners when filters reset", () => {
      const store = createStore();
      const listener = vi.fn();

      store.subscribe(listener);
      store.resetFilters();

      expect(listener).toHaveBeenCalledOnce();
    });

    it("should notify multiple listeners", () => {
      const store = createStore();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      store.subscribe(listener1);
      store.subscribe(listener2);
      store.setFilters({ active: true });

      expect(listener1).toHaveBeenCalledOnce();
      expect(listener2).toHaveBeenCalledOnce();
    });

    it("should return unsubscribe function", () => {
      const store = createStore();
      const listener = vi.fn();

      const unsubscribe = store.subscribe(listener);
      unsubscribe();
      store.setFilters({ active: true });

      expect(listener).not.toHaveBeenCalled();
    });

    it("should only unsubscribe the specific listener", () => {
      const store = createStore();
      const listener1 = vi.fn();
      const listener2 = vi.fn();

      const unsubscribe1 = store.subscribe(listener1);
      store.subscribe(listener2);

      unsubscribe1();
      store.setFilters({ active: true });

      expect(listener1).not.toHaveBeenCalled();
      expect(listener2).toHaveBeenCalledOnce();
    });
  });
});
