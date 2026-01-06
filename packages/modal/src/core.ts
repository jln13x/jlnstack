import type { Modal, ModalComponentOptions, ModalDef } from "./modal-client";

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

type ModalRegistry<TModals extends Record<string, unknown>> = {
  [K in keyof TModals]: TModals[K] extends Modal<infer TInput, infer TOutput>
    ? Modal<TInput, TOutput>
    : TModals[K] extends Record<string, unknown>
      ? ModalRegistry<TModals[K]>
      : never;
};

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
        component: (
          input: I,
          options: ModalComponentOptions<TOutput>,
        ) => unknown,
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
    create(component: any): Modal<any, any> {
      const def: ModalDef<any, any> = { component };
      return { _def: def };
    },
  } as ModalBuilder<TInput, TOutput>;
}

const modal: ModalBuilder<never, undefined> = createModalBuilder();

function createModalRegistry<
  TModals extends Record<string, Modal<any, any> | Record<string, unknown>>,
>(modals: TModals): ModalRegistry<TModals> {
  return modals as unknown as ModalRegistry<TModals>;
}

export { modal, createModalRegistry, type ModalRegistry, type StandardSchemaV1 };
