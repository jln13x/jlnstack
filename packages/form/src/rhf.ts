import type { StandardSchemaV1 } from "@standard-schema/spec";
import type {
  FieldValues,
  UseFormProps,
  UseFormReturn,
} from "react-hook-form";

/**
 * Infer the output type from a Standard Schema
 */
export type InferOutput<TSchema extends StandardSchemaV1> =
  StandardSchemaV1.InferOutput<TSchema>;

/**
 * Infer the input type from a Standard Schema
 */
export type InferInput<TSchema extends StandardSchemaV1> =
  StandardSchemaV1.InferInput<TSchema>;

/**
 * Ensures a type is compatible with react-hook-form's FieldValues
 * Falls back to FieldValues if the type doesn't extend Record<string, any>
 */
type ToFieldValues<T> = T extends FieldValues ? T : FieldValues;

/**
 * Props for the typed useForm hook
 * Omits 'resolver' since it's automatically provided by createForm
 */
export type TypedUseFormProps<
  TFieldValues extends FieldValues = FieldValues,
  TContext = any,
  TTransformedValues = TFieldValues,
> = Omit<UseFormProps<TFieldValues, TContext, TTransformedValues>, "resolver">;

/**
 * The return type of createForm
 * Provides typed useForm and useFormContext hooks bound to the schema
 */
export interface CreateFormReturn<
  TSchema extends StandardSchemaV1,
  TFieldValues extends FieldValues = ToFieldValues<InferInput<TSchema>>,
  TTransformedValues = InferOutput<TSchema>,
> {
  /**
   * A typed useForm hook that automatically includes the schema resolver.
   * The returned form is typed based on the schema's input type.
   * handleSubmit receives the schema's output type (after validation/transformation).
   */
  useForm: <TContext = any>(
    props?: TypedUseFormProps<TFieldValues, TContext, TTransformedValues>
  ) => UseFormReturn<TFieldValues, TContext, TTransformedValues>;

  /**
   * A typed useFormContext hook that returns the form instance with correct types.
   * Must be used within a FormProvider that was given a form from useForm.
   */
  useFormContext: <TContext = any>() => UseFormReturn<
    TFieldValues,
    TContext,
    TTransformedValues
  >;

  /**
   * The schema used to create this form instance
   */
  schema: TSchema;
}

/**
 * Creates a typed form instance based on a Standard Schema.
 *
 * Supports any schema library implementing the Standard Schema spec:
 * - Zod (v3.23+)
 * - Valibot (v1+)
 * - ArkType
 * - Effect Schema
 * - TypeBox
 *
 * @example
 * ```typescript
 * import { z } from 'zod';
 * import { createForm } from '@jlnstack/form/rhf';
 *
 * const schema = z.object({
 *   name: z.string(),
 *   email: z.string().email(),
 * });
 *
 * const { useForm, useFormContext } = createForm(schema);
 *
 * // In your component:
 * function MyForm() {
 *   const form = useForm({
 *     defaultValues: { name: '', email: '' }
 *   });
 *
 *   return (
 *     <form onSubmit={form.handleSubmit((data) => {
 *       // data is typed as { name: string; email: string }
 *       console.log(data);
 *     })}>
 *       <input {...form.register('name')} />
 *       <input {...form.register('email')} />
 *     </form>
 *   );
 * }
 * ```
 *
 * @example Using with Valibot
 * ```typescript
 * import * as v from 'valibot';
 * import { createForm } from '@jlnstack/form/rhf';
 *
 * const schema = v.object({
 *   username: v.pipe(v.string(), v.minLength(3)),
 *   password: v.pipe(v.string(), v.minLength(8)),
 * });
 *
 * const { useForm } = createForm(schema);
 * ```
 *
 * @param schema - A Standard Schema compliant validation schema
 * @returns An object with typed useForm and useFormContext hooks
 */
export declare function createForm<TSchema extends StandardSchemaV1>(
  schema: TSchema
): CreateFormReturn<TSchema>;
