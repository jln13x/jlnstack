import type {
  ModalComponentOptions,
  ModalDef,
  ModalOptions,
} from "./modal-client";

type Modal<TInput, TOutput> = {
  modalOptions: (options?: {
    input?: TInput;
    onClose?: () => void;
    onOpen?: (input: TInput) => void;
  }) => ModalOptions<TInput, TOutput>;
  _def: ModalDef<TInput, TOutput>;
};

type ModalRegistry<TModals extends Record<string, unknown>> = {
  [K in keyof TModals]: TModals[K] extends Modal<infer TInput, infer TOutput>
    ? Modal<TInput, TOutput>
    : TModals[K] extends Record<string, unknown>
      ? ModalRegistry<TModals[K]>
      : never;
};

type ModalBuilder<TInput, TOutput> = {
  input<T>(): ModalBuilder<T, TOutput>;
  output<T>(): ModalBuilder<TInput, T>;
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
    input<T>(): ModalBuilder<T, TOutput> {
      return createModalBuilder<T, TOutput>();
    },
    output<T>(): ModalBuilder<TInput, T> {
      return createModalBuilder<TInput, T>();
    },
    create(component: any): Modal<any, TOutput> {
      const def: ModalDef<any, TOutput> = {
        component,
      };

      return {
        _def: def,
        modalOptions: (modalOptions) => ({
          _def: def,
          input: modalOptions?.input,
          onOpen: modalOptions?.onOpen,
          onClose: modalOptions?.onClose,
        }),
      };
    },
  } as ModalBuilder<TInput, TOutput>;
}

const modal: ModalBuilder<never, undefined> = createModalBuilder();

function createModalRegistry<
  TModals extends Record<string, Modal<any, any> | Record<string, unknown>>,
>(modals: TModals): ModalRegistry<TModals> {
  return modals as unknown as ModalRegistry<TModals>;
}

export { modal, createModalRegistry, type Modal, type ModalRegistry };
