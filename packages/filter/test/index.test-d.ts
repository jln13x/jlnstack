import { describe, expectTypeOf, it } from "vitest";
import {
  booleanFilter,
  createFilter,
  type FilterInput,
  type FilterValue,
  stringFilter,
} from "../src/index";

describe("type tests", () => {
  it("should infer value type without operators", () => {
    const filter = booleanFilter();
    type Value = FilterValue<typeof filter>;
    expectTypeOf<Value>().toEqualTypeOf<boolean>();
  });

  it("should infer value type with operators", () => {
    const filter = stringFilter({ operators: ["eq", "contains"] });
    type Value = FilterValue<typeof filter>;
    expectTypeOf<Value>().toEqualTypeOf<{
      operator: "eq" | "neq" | "contains" | "startsWith" | "endsWith";
      value: string;
    }>();
  });

  it("should infer custom filter value", () => {
    const filter = createFilter("dateRange")
      .input<{ from: Date; to: Date }>()
      .options()();
    type Value = FilterValue<typeof filter>;
    expectTypeOf<Value>().toEqualTypeOf<{ from: Date; to: Date }>();
  });

  it("should infer schema input types", () => {
    const schema = {
      name: stringFilter({ operators: ["eq", "contains"] }),
      isActive: booleanFilter(),
    };

    type Input = FilterInput<typeof schema>;

    expectTypeOf<Input>().toEqualTypeOf<{
      name?: {
        operator: "eq" | "neq" | "contains" | "startsWith" | "endsWith";
        value: string;
      };
      isActive?: boolean;
    }>();
  });
});
