import { createFilter } from "../index";

type BooleanFilterOptions = {
  label?: string;
  trueLabel?: string;
  falseLabel?: string;
};

export const booleanFilter = createFilter("boolean")
  .input<boolean>()
  .options<BooleanFilterOptions>();

export type { BooleanFilterOptions };
