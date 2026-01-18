import { createFilter } from "../index";

type DateOperators = "eq" | "neq" | "gt" | "gte" | "lt" | "lte";

type DateValue<Operators extends DateOperators = DateOperators> = {
  operator: Operators;
  value: Date | string;
};

type DateFilterOptions<Ops extends DateOperators = DateOperators> = {
  label?: string;
  operators?: Ops[];
};

export const dateFilter = createFilter("date")
  .input<DateValue>()
  .options<DateFilterOptions>();

export type { DateOperators, DateValue, DateFilterOptions };
