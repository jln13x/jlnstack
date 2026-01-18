/**
 * Type tests for rhf.ts
 * These tests verify type inference without runtime execution
 */

import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { CreateFormReturn, InferInput, InferOutput } from "./rhf";

// ============================================================================
// Test helpers
// ============================================================================

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;

// Assignability check - less strict than Equal
type IsAssignable<Target, Source> = Source extends Target ? true : false;

// ============================================================================
// Mock schemas for testing (simulating Zod, Valibot, etc.)
// ============================================================================

// A simple schema with matching input/output types
type UserSchema = StandardSchemaV1<
  { name: string; email: string },
  { name: string; email: string }
>;

// A schema with transformed output (input string -> output number)
type TransformSchema = StandardSchemaV1<{ age: string }, { age: number }>;

// A complex nested schema
type NestedSchema = StandardSchemaV1<
  {
    user: { name: string; email: string };
    settings: { theme: "light" | "dark" };
  },
  {
    user: { name: string; email: string };
    settings: { theme: "light" | "dark" };
  }
>;

// ============================================================================
// InferInput / InferOutput tests
// ============================================================================

// Test InferInput extracts input type correctly
type _TestInferInput = Expect<
  Equal<InferInput<UserSchema>, { name: string; email: string }>
>;

// Test InferOutput extracts output type correctly
type _TestInferOutput = Expect<
  Equal<InferOutput<UserSchema>, { name: string; email: string }>
>;

// Test transform schema input/output differ
type _TestTransformInput = Expect<
  Equal<InferInput<TransformSchema>, { age: string }>
>;
type _TestTransformOutput = Expect<
  Equal<InferOutput<TransformSchema>, { age: number }>
>;

// ============================================================================
// CreateFormReturn structural tests
// ============================================================================

type UserFormReturn = CreateFormReturn<UserSchema>;

// Verify the structure has the expected properties
type _TestHasUseForm = Expect<
  IsAssignable<(...args: any[]) => any, UserFormReturn["useForm"]>
>;
type _TestHasUseFormContext = Expect<
  IsAssignable<(...args: any[]) => any, UserFormReturn["useFormContext"]>
>;
type _TestHasSchema = Expect<
  IsAssignable<StandardSchemaV1, UserFormReturn["schema"]>
>;

// ============================================================================
// UseForm return type - field values inference
// ============================================================================

declare const userFormReturn: CreateFormReturn<UserSchema>;
declare const transformFormReturn: CreateFormReturn<TransformSchema>;

// Get actual return types
type UserUseFormResult = ReturnType<typeof userFormReturn.useForm>;
type TransformUseFormResult = ReturnType<typeof transformFormReturn.useForm>;

// Test that register accepts correct field names
declare const userForm: UserUseFormResult;
const _validRegister1 = userForm.register("name");
const _validRegister2 = userForm.register("email");
// @ts-expect-error - invalid field name
const _invalidRegister = userForm.register("invalid");

// Test that watch with field name returns correct type
const _watchName: string = userForm.watch("name");
const _watchEmail: string = userForm.watch("email");
// @ts-expect-error - invalid field name
const _watchInvalid = userForm.watch("invalid");

// ============================================================================
// Transform schema - handleSubmit types
// ============================================================================

declare const transformForm: TransformUseFormResult;

// The handleSubmit callback should receive the transformed (output) type
transformForm.handleSubmit((data) => {
  // data.age should be number (transformed from string)
  const _age: number = data.age;
  // @ts-expect-error - age is number, not string
  const _ageString: string = data.age;
});

// But register/setValue should use the input type
const _registerAge = transformForm.register("age");
transformForm.setValue("age", "25"); // Input is string
// @ts-expect-error - setValue expects string (input type), not number
transformForm.setValue("age", 25);

// ============================================================================
// Nested schema tests
// ============================================================================

declare const nestedFormReturn: CreateFormReturn<NestedSchema>;
declare const nestedForm: ReturnType<typeof nestedFormReturn.useForm>;

// Test nested field registration (dot notation)
const _registerUserName = nestedForm.register("user.name");
const _registerTheme = nestedForm.register("settings.theme");
// @ts-expect-error - invalid nested path
const _registerInvalidNested = nestedForm.register("user.invalid");

// ============================================================================
// useFormContext type tests
// ============================================================================

declare const contextForm: ReturnType<typeof userFormReturn.useFormContext>;

// useFormContext should have the same types as useForm return
const _contextRegister = contextForm.register("name");
// @ts-expect-error - invalid field name in context
const _contextInvalid = contextForm.register("invalid");

// ============================================================================
// Props tests - verify defaultValues is typed
// ============================================================================

// Valid defaultValues
userFormReturn.useForm({
  defaultValues: {
    name: "test",
    email: "test@example.com",
  },
});

// Partial defaultValues should also work
userFormReturn.useForm({
  defaultValues: {
    name: "test",
  },
});

// Verify resolver is NOT in props type
type UseFormProps = Parameters<typeof userFormReturn.useForm>[0];
type HasResolver = "resolver" extends keyof NonNullable<UseFormProps>
  ? true
  : false;
type _TestNoResolver = Expect<Equal<HasResolver, false>>;

// ============================================================================
// Schema property preservation
// ============================================================================

type _TestSchemaPreserved = Expect<
  Equal<UserFormReturn["schema"], UserSchema>
>;
