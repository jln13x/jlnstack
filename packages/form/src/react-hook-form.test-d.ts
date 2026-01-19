import type { CreateFormReturn } from "./react-hook-form";

declare const simpleForm: CreateFormReturn<
  { name: string; email: string },
  { name: string; email: string }
>;
declare const transformForm: CreateFormReturn<{ age: string }, { age: number }>;

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
