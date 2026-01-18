import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import type { StandardSchemaV1 } from "@standard-schema/spec";
import {
  type FieldValues,
  useForm as rhfUseForm,
  useFormContext as rhfUseFormContext,
  type UseFormProps,
  type UseFormReturn,
} from "react-hook-form";

type ToFieldValues<T> = T extends FieldValues ? T : FieldValues;

export interface CreateFormReturn<
  TSchema extends StandardSchemaV1,
  TFieldValues extends FieldValues = ToFieldValues<
    StandardSchemaV1.InferInput<TSchema>
  >,
  TTransformedValues = StandardSchemaV1.InferOutput<TSchema>,
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

  schema: TSchema;
}

export function createForm<TSchema extends StandardSchemaV1>(
  schema: TSchema,
): CreateFormReturn<TSchema> {
  const resolver = standardSchemaResolver(
    schema as StandardSchemaV1<FieldValues, FieldValues>,
  );

  return {
    useForm: (props) => {
      return rhfUseForm({
        ...props,
        resolver,
      } as UseFormProps<FieldValues, any, FieldValues>) as any;
    },

    useFormContext: () => {
      return rhfUseFormContext() as any;
    },

    schema,
  };
}
