import { createFilter } from "../index";

type StringOperators = "eq" | "neq" | "contains" | "startsWith" | "endsWith";

type StringValue<Operators extends StringOperators = StringOperators> = {
  operator: Operators;
  value: string;
};

type StringFilterOptions<Ops extends StringOperators = StringOperators> = {
  label?: string;
  operators?: Ops[];
  placeholder?: string;
};

export const stringFilter = createFilter("string")
  .input<StringValue>()
  .options<StringFilterOptions>();

export type { StringOperators, StringValue, StringFilterOptions };
