import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
} from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it } from "vitest";
import { booleanFilter, numberFilter, stringFilter } from "../src/index";
import {
  createFilterHooks,
  FilterProvider,
  useFilterDefinitions,
  useFilter,
  useFilterContext,
  useFilterValue,
  useFilterValues,
} from "../src/react";

const schema = {
  name: stringFilter({ operators: ["eq", "contains"] }),
  age: numberFilter({ operators: ["gt", "lt", "eq"] }),
  active: booleanFilter(),
};

type Schema = typeof schema;

afterEach(cleanup);

describe("useFilter", () => {
  it("should return stable references across renders", () => {
    const { result, rerender } = renderHook(() => useFilter(schema));

    const first = result.current;
    rerender();
    const second = result.current;

    expect(first._store).toBe(second._store);
    expect(first.Filter).toBe(second.Filter);
    expect(first.schema).toBe(second.schema);
  });

  it("should expose all expected properties", () => {
    const { result } = renderHook(() => useFilter(schema));

    expect(result.current).toMatchObject({
      schema,
      setFilter: expect.any(Function),
      setFilters: expect.any(Function),
      clear: expect.any(Function),
      reset: expect.any(Function),
      getFilters: expect.any(Function),
      Filter: expect.any(Function),
      useFilterValues: expect.any(Function),
      useFilterValue: expect.any(Function),
      useFilterDefinitions: expect.any(Function),
      _store: expect.any(Object),
    });
  });

  it("derived hooks should react to store changes", () => {
    const { result } = renderHook(() => {
      const filter = useFilter(schema);
      const values = filter.useFilterValues();
      return { filter, values };
    });

    expect(result.current.values).toEqual({});

    act(() => {
      result.current.filter.setFilter("active", true);
    });

    expect(result.current.values).toEqual({ active: true });
  });
});

describe("context hooks", () => {
  function setup() {
    const filterHook = renderHook(() => useFilter(schema));
    const wrapper = ({ children }: { children: ReactNode }) => (
      <FilterProvider {...filterHook.result.current}>{children}</FilterProvider>
    );
    return { filterHook, wrapper };
  }

  describe("outside provider", () => {
    it("useFilterContext throws", () => {
      expect(() => renderHook(() => useFilterContext())).toThrow(
        "must be used within FilterProvider",
      );
    });

    it("useFilterValue throws", () => {
      expect(() => renderHook(() => useFilterValue("name"))).toThrow(
        "must be used within FilterProvider",
      );
    });

    it("useFilterValues throws", () => {
      expect(() => renderHook(() => useFilterValues())).toThrow(
        "must be used within FilterProvider",
      );
    });

    it("useFilterDefinitions throws", () => {
      expect(() => renderHook(() => useFilterDefinitions())).toThrow(
        "must be used within FilterProvider",
      );
    });
  });

  describe("useFilterContext", () => {
    it("should provide access to filter instance", () => {
      const { filterHook, wrapper } = setup();
      const { result } = renderHook(() => useFilterContext<Schema>(), {
        wrapper,
      });

      expect(result.current.schema).toBe(schema);
      expect(result.current.getFilters()).toEqual(
        filterHook.result.current.getFilters(),
      );
    });
  });

  describe("useFilterValue", () => {
    it("should react to filter changes", () => {
      const { filterHook, wrapper } = setup();
      const { result } = renderHook(() => useFilterValue<Schema>("name"), {
        wrapper,
      });

      expect(result.current).toBeUndefined();

      act(() => {
        filterHook.result.current.setFilter("name", {
          operator: "eq",
          value: "John",
        });
      });

      expect(result.current).toEqual({ operator: "eq", value: "John" });
    });
  });

  describe("useFilterValues", () => {
    it("should react to filter changes", () => {
      const { filterHook, wrapper } = setup();
      const { result } = renderHook(() => useFilterValues<Schema>(), {
        wrapper,
      });

      expect(result.current).toEqual({});

      act(() => {
        filterHook.result.current.setFilters({
          name: { operator: "eq", value: "John" },
          active: true,
        });
      });

      expect(result.current).toEqual({
        name: { operator: "eq", value: "John" },
        active: true,
      });
    });
  });

  describe("useFilterDefinitions", () => {
    it("should return all schema filters with metadata", () => {
      const { wrapper } = setup();
      const { result } = renderHook(() => useFilterDefinitions<Schema>(), {
        wrapper,
      });

      expect(result.current).toHaveLength(3);
      expect(result.current.map((f) => f.name)).toEqual([
        "name",
        "age",
        "active",
      ]);
      expect(result.current[0]).toMatchObject({
        id: "string",
        name: "name",
      });
    });
  });
});

describe("createFilterHooks", () => {
  it("should create pre-bound hooks for schema", () => {
    const hooks = createFilterHooks(schema);
    const { result } = renderHook(() => hooks.useFilter());

    expect(result.current.schema).toBe(schema);

    act(() => {
      result.current.setFilter("name", { operator: "eq", value: "test" });
    });

    expect(result.current.getFilters()).toEqual({
      name: { operator: "eq", value: "test" },
    });
  });
});

describe("Filter component", () => {
  it("should render with field data and react to changes", () => {
    const { result: filterResult } = renderHook(() => useFilter(schema));
    const Filter = filterResult.current.Filter;

    render(
      <Filter
        name="name"
        render={(field) => (
          <div>
            <span data-testid="name">{field.name}</span>
            <span data-testid="type">{field.type}</span>
            <span data-testid="value">{JSON.stringify(field.value)}</span>
            <button
              type="button"
              onClick={() =>
                field.onValueChange({ operator: "eq", value: "test" })
              }
            >
              Set
            </button>
            <button type="button" onClick={field.onClear}>
              Clear
            </button>
          </div>
        )}
      />,
    );

    expect(screen.getByTestId("name")).toHaveTextContent("name");
    expect(screen.getByTestId("type")).toHaveTextContent("string");
    expect(screen.getByTestId("value")).toHaveTextContent("");

    act(() => {
      screen.getByText("Set").click();
    });

    expect(screen.getByTestId("value")).toHaveTextContent(
      '{"operator":"eq","value":"test"}',
    );
    expect(filterResult.current.getFilters()).toEqual({
      name: { operator: "eq", value: "test" },
    });

    act(() => {
      screen.getByText("Clear").click();
    });

    expect(screen.getByTestId("value")).toHaveTextContent("");
    expect(filterResult.current.getFilters()).toEqual({});
  });

  it("should provide filter definition", () => {
    const { result: filterResult } = renderHook(() => useFilter(schema));
    const Filter = filterResult.current.Filter;

    render(
      <Filter
        name="age"
        render={(field) => (
          <span data-testid="def-id">{field.definition.id}</span>
        )}
      />,
    );

    expect(screen.getByTestId("def-id")).toHaveTextContent("number");
  });
});
