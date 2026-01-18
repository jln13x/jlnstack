import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { CreateFormReturn } from "./rhf";

type Expect<T extends true> = T;
type Equal<X, Y> = (<T>() => T extends X ? 1 : 2) extends <T>() => T extends Y
  ? 1
  : 2
  ? true
  : false;

type UserSchema = StandardSchemaV1<
  { name: string; email: string },
  { name: string; email: string }
>;

type TransformSchema = StandardSchemaV1<{ age: string }, { age: number }>;

declare const simpleForm: CreateFormReturn<UserSchema>;
declare const transformForm: CreateFormReturn<TransformSchema>;

// useForm return type has correct field values
declare const form: ReturnType<typeof simpleForm.useForm>;
const _name: string = form.watch("name");
// @ts-expect-error - invalid field
form.register("invalid");

// handleSubmit receives transformed output type
declare const tform: ReturnType<typeof transformForm.useForm>;
tform.handleSubmit((data) => {
  const _age: number = data.age;
  // @ts-expect-error - age is number not string
  const _str: string = data.age;
});

// setValue uses input type
tform.setValue("age", "25");
// @ts-expect-error - expects string not number
tform.setValue("age", 25);

// useFormContext has same types
declare const ctx: ReturnType<typeof simpleForm.useFormContext>;
ctx.register("name");
// @ts-expect-error - invalid field
ctx.register("invalid");

// schema is preserved
type _SchemaPreserved = Expect<
  Equal<(typeof simpleForm)["schema"], UserSchema>
>;
