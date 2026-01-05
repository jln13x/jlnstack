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
  useFilter,
  useFilterById,
  useFilterContext,
  useFilterDefinitions,
} from "../src/react";
import { useFilter as useFilterHook } from "../src/react/use-filter";
import { isGroup } from "../src/types";

const schema = {
  name: stringFilter({ operators: ["eq", "contains"] }),
  age: numberFilter({ operators: ["gt", "lt", "eq"] }),
  active: booleanFilter(),
};

type Schema = typeof schema;

afterEach(cleanup);

describe("useFilter hook", () => {
  it("should return stable references across renders", () => {
    const { result, rerender } = renderHook(() => useFilterHook(schema));

    const first = result.current;
    rerender();
    const second = result.current;

    expect(first._store).toBe(second._store);
    expect(first.Filter).toBe(second.Filter);
    expect(first.schema).toBe(second.schema);
  });

  it("should expose expected properties", () => {
    const { result } = renderHook(() => useFilterHook(schema));

    expect(result.current).toMatchObject({
      schema,
      rootId: expect.any(String),
      getFilter: expect.any(Function),
      getFilterById: expect.any(Function),
      addCondition: expect.any(Function),
      addGroup: expect.any(Function),
      Filter: expect.any(Function),
      useFilter: expect.any(Function),
      useFilterById: expect.any(Function),
      useFilterDefinitions: expect.any(Function),
      _store: expect.any(Object),
    });
  });

  it("derived hooks should react to store changes", () => {
    const { result } = renderHook(() => {
      const filter = useFilterHook(schema);
      const tree = filter.useFilter();
      return { filter, tree };
    });

    expect(result.current.tree.filters).toHaveLength(0);

    act(() => {
      result.current.filter.addCondition({ field: "active", value: true });
    });

    expect(result.current.tree.filters).toHaveLength(1);
  });
});

describe("context hooks", () => {
  function setup() {
    const filterHook = renderHook(() => useFilterHook(schema));
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

    it("useFilter throws", () => {
      expect(() => renderHook(() => useFilter())).toThrow(
        "must be used within FilterProvider",
      );
    });

    it("useFilterById throws", () => {
      expect(() => renderHook(() => useFilterById("id"))).toThrow(
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
      expect(result.current.getFilter()).toEqual(
        filterHook.result.current.getFilter(),
      );
    });
  });

  describe("useFilter (context)", () => {
    it("should react to filter changes", () => {
      const { filterHook, wrapper } = setup();
      const { result } = renderHook(() => useFilter<Schema>(), { wrapper });

      expect(result.current.filters).toHaveLength(0);

      act(() => {
        filterHook.result.current.addCondition({
          field: "active",
          value: true,
        });
      });

      expect(result.current.filters).toHaveLength(1);
    });
  });

  describe("useFilterById", () => {
    it("should react to changes", async () => {
      const { filterHook, wrapper } = setup();

      const conditionId = await act(async () => {
        return filterHook.result.current.addCondition({
          field: "active",
          value: true,
        });
      });

      const { result } = renderHook(() => useFilterById<Schema>(conditionId), {
        wrapper,
      });

      expect(result.current).toMatchObject({ value: true });

      await act(async () => {
        filterHook.result.current.updateCondition({
          id: conditionId,
          value: false,
        });
      });

      expect(result.current).toMatchObject({ value: false });
    });
  });

  describe("useFilterDefinitions", () => {
    it("should return schema filters with metadata", () => {
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
    });
  });
});

describe("createFilterHooks", () => {
  it("should create pre-bound hooks for schema", () => {
    const hooks = createFilterHooks(schema);
    const { result } = renderHook(() => hooks.useFilter());

    expect(result.current.schema).toBe(schema);
  });
});

describe("Filter component", () => {
  it("should render condition data and handle interactions", async () => {
    const { result: filterResult } = renderHook(() => useFilterHook(schema));
    const Filter = filterResult.current.Filter;

    const conditionId = await act(async () => {
      return filterResult.current.addCondition({
        field: "name",
        value: { operator: "eq", value: "initial" },
      });
    });

    const condition = filterResult.current.getFilterById(conditionId);
    if (!condition || isGroup(condition)) throw new Error("Expected condition");

    render(
      <Filter
        condition={condition}
        render={(field) => (
          <div>
            <span data-testid="field">{String(field.field)}</span>
            <span data-testid="value">{JSON.stringify(field.value)}</span>
            <button
              type="button"
              onClick={() =>
                field.onValueChange({ operator: "contains", value: "updated" })
              }
            >
              Update
            </button>
            <button type="button" onClick={field.onRemove}>
              Remove
            </button>
          </div>
        )}
      />,
    );

    expect(screen.getByTestId("field")).toHaveTextContent("name");

    await act(async () => {
      screen.getByText("Update").click();
    });

    expect(screen.getByTestId("value")).toHaveTextContent(
      '{"operator":"contains","value":"updated"}',
    );

    await act(async () => {
      screen.getByText("Remove").click();
    });

    expect(filterResult.current.getFilterById(conditionId)).toBeUndefined();
  });
});
