import { createFilter } from "../index";

type NumberOperators = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

type NumberValue<Operators extends NumberOperators = NumberOperators> = {
  operator: Operators;
  value: number;
};

type NumberFilterOptions<Ops extends NumberOperators = NumberOperators> = {
  label?: string;
  operators?: Ops[];
  min?: number;
  max?: number;
};

export const numberFilter = createFilter("number")
  .input<NumberValue>()
  .options<NumberFilterOptions>();

export type { NumberOperators, NumberValue, NumberFilterOptions };
