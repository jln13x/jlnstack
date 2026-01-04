import { describe, expect, it } from "vitest";
import {
  booleanFilter,
  createFilter,
  dateFilter,
  numberFilter,
  stringFilter,
} from "../src/index";

describe("createFilter", () => {
  it("should create a filter with id (no options)", () => {
    const filter = createFilter("custom").input<string>().options()();
    expect(filter.id).toBe("custom");
  });

  it("should create a filter with options", () => {
    const filter = createFilter("string")
      .input<{ operator: "eq" | "contains"; value: string }>()
      .options<{ operators: ("eq" | "contains")[] }>()({
      operators: ["eq", "contains"],
    });
    expect(filter.id).toBe("string");
    expect(filter.operators).toEqual(["eq", "contains"]);
  });
});

describe("built-in filters", () => {
  it("should create string filter without options", () => {
    const filter = stringFilter();
    expect(filter.id).toBe("string");
  });

  it("should create string filter with options", () => {
    const filter = stringFilter({ operators: ["eq", "contains"] });
    expect(filter.id).toBe("string");
    expect(filter.operators).toEqual(["eq", "contains"]);
  });

  it("should create number filter", () => {
    const filter = numberFilter({ operators: ["gt", "lt"] });
    expect(filter.id).toBe("number");
    expect(filter.operators).toEqual(["gt", "lt"]);
  });

  it("should create boolean filter", () => {
    const filter = booleanFilter();
    expect(filter.id).toBe("boolean");
  });

  it("should create date filter", () => {
    const filter = dateFilter({ operators: ["gte", "lte"] });
    expect(filter.id).toBe("date");
    expect(filter.operators).toEqual(["gte", "lte"]);
  });
});
