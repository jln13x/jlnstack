import type { Modal, ModalComponentOptions, ModalDef } from "./types";

type StandardSchemaV1<T = unknown> = {
  readonly "~standard": {
    readonly version: 1;
    readonly vendor: string;
    readonly validate: unknown;
  };
  readonly "~output": T;
};

type InferSchema<T> = T extends StandardSchemaV1<infer O>
  ? O
  : T extends { _output: infer O }
    ? O
    : T;

type ModalBuilder<TInput, TOutput> = {
  input: {
    <T>(): ModalBuilder<T, TOutput>;
    <T extends StandardSchemaV1>(schema: T): ModalBuilder<InferSchema<T>, TOutput>;
  };
  output: {
    <T>(): ModalBuilder<TInput, T>;
    <T extends StandardSchemaV1>(schema: T): ModalBuilder<TInput, InferSchema<T>>;
  };
  create: [TInput] extends [never]
    ? <I>(
        component: (input: I, options: ModalComponentOptions<TOutput>) => unknown,
      ) => Modal<I, TOutput>
    : (
        component: (
          input: TInput,
          options: ModalComponentOptions<TOutput>,
        ) => unknown,
      ) => Modal<TInput, TOutput>;
};

function createModalBuilder<TInput, TOutput>(): ModalBuilder<TInput, TOutput> {
  return {
    input(_schema?: unknown) {
      return createModalBuilder();
    },
    output(_schema?: unknown) {
      return createModalBuilder();
    },
    create(component: (input: unknown, options: ModalComponentOptions<unknown>) => unknown): Modal<unknown, unknown> {
      const def: ModalDef<unknown, unknown> = { component };
      return { _def: def };
    },
  } as ModalBuilder<TInput, TOutput>;
}

export const modal: ModalBuilder<never, undefined> = createModalBuilder();

export type { ModalBuilder, StandardSchemaV1 };
