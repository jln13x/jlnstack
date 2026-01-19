import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  type FieldValues,
  useForm as rhfUseForm,
  useFormContext as rhfUseFormContext,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";

export interface CreateFormReturn<
  TFieldValues extends FieldValues,
  TTransformedValues,
> {
  useForm: <TContext = any>(
    props?: Omit<
      UseFormProps<TFieldValues, TContext, TTransformedValues>,
      "resolver"
    >,
  ) => UseFormReturn<TFieldValues, TContext, TTransformedValues>;

  useFormContext: <TContext = any>() => UseFormReturn<
    TFieldValues,
    TContext,
    TTransformedValues
  >;
}

export function createForm<
  TFieldValues extends FieldValues,
  TTransformedValues = TFieldValues,
>(
  schema: StandardSchemaV1<TFieldValues, TTransformedValues>,
): CreateFormReturn<TFieldValues, TTransformedValues> {
  const resolver = standardSchemaResolver(
    schema as StandardSchemaV1<FieldValues, FieldValues>,
  );

  return {
    useForm: (props) =>
      rhfUseForm({
        ...props,
        resolver,
      } as UseFormProps<FieldValues>) as unknown as UseFormReturn<
        TFieldValues,
        any,
        TTransformedValues
      >,

    useFormContext: () =>
      rhfUseFormContext() as unknown as UseFormReturn<
        TFieldValues,
        any,
        TTransformedValues
      >,
  };
}
