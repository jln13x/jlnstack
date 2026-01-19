import type {
  Modal,
  ModalComponentOptions,
  ModalDef,
  ServerModal,
  TemplateWrapper,
} from "./types";

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

type CreateOptions<TInput, TTemplateProps> = {
  defaultValues?: {
    modal?: Partial<TInput>;
  } & ([TTemplateProps] extends [never]
    ? {}
    : { template?: Partial<TTemplateProps> });
};

type ModalBuilder<TInput, TOutput, TTemplateProps = never> = {
  input: {
    <T>(): ModalBuilder<T, TOutput, TTemplateProps>;
    <T extends StandardSchemaV1>(
      schema: T,
    ): ModalBuilder<InferSchema<T>, TOutput, TTemplateProps>;
  };
  output: {
    <T>(): ModalBuilder<TInput, T, TTemplateProps>;
    <T extends StandardSchemaV1>(
      schema: T,
    ): ModalBuilder<TInput, InferSchema<T>, TTemplateProps>;
  };
  template: <T>(
    wrapper: TemplateWrapper<TOutput, T>,
  ) => ModalBuilder<TInput, TOutput, T>;
  create: [TInput] extends [never]
    ? <I, TDefaults extends Partial<I> = {}>(
        component: (
          input: I,
          options: ModalComponentOptions<TOutput>,
        ) => unknown,
        options?: CreateOptions<I, TTemplateProps> & {
          defaultValues?: { modal?: TDefaults };
        },
      ) => Modal<I, TOutput, TDefaults>
    : <TDefaults extends Partial<TInput> = {}>(
        component: (
          input: TInput,
          options: ModalComponentOptions<TOutput>,
        ) => unknown,
        options?: CreateOptions<TInput, TTemplateProps> & {
          defaultValues?: { modal?: TDefaults };
        },
      ) => Modal<TInput, TOutput, TDefaults>;
  /**
   * Create a server modal with an async render function.
   *
   * IMPORTANT: This must be called in a file with "use server" directive
   * for the render function to become a server action.
   *
   * @example
   * ```tsx
   * // modals.server.ts
   * "use server"
   * import { modal } from "@jlnstack/modal";
   *
   * export const userModal = modal
   *   .input<{ userId: string }>()
   *   .server(async ({ userId }) => {
   *     const user = await db.users.get(userId);
   *     return <UserProfile user={user} />;
   *   });
   * ```
   */
  server: [TInput] extends [never]
    ? <I, TDefaults extends Partial<I> = {}>(
        render: (input: I) => Promise<unknown>,
        options?: { defaultValues?: TDefaults },
      ) => ServerModal<I, TOutput, TDefaults>
    : <TDefaults extends Partial<TInput> = {}>(
        render: (input: TInput) => Promise<unknown>,
        options?: { defaultValues?: TDefaults },
      ) => ServerModal<TInput, TOutput, TDefaults>;
};

function createModalBuilder<TInput, TOutput, TTemplateProps = never>(
  templateWrapper?: TemplateWrapper<TOutput, TTemplateProps>,
): ModalBuilder<TInput, TOutput, TTemplateProps> {
  return {
    input(_schema?: unknown) {
      return createModalBuilder(templateWrapper);
    },
    output(_schema?: unknown) {
      return createModalBuilder(templateWrapper);
    },
    template<T>(wrapper: TemplateWrapper<TOutput, T>) {
      return createModalBuilder<TInput, TOutput, T>(wrapper);
    },
    create(
      component: (
        input: unknown,
        options: ModalComponentOptions<unknown>,
      ) => unknown,
      options?: {
        defaultValues?: {
          template?: Record<string, unknown>;
          modal?: Record<string, unknown>;
        };
      },
    ) {
      const inputDefaults = options?.defaultValues?.modal ?? {};
      const templateProps = options?.defaultValues?.template ?? {};

      const def: ModalDef<unknown, unknown> = {
        component: (input, opts) => {
          const mergedInput = {
            ...inputDefaults,
            ...(input as Record<string, unknown>),
          };
          const content = component(mergedInput, opts);

          if (templateWrapper) {
            return templateWrapper({
              modal: content,
              close: opts.close,
              resolve: opts.resolve as (value: unknown) => void,
              props: templateProps as TTemplateProps,
            });
          }
          return content;
        },
      };
      return { _type: "modal", _def: def, _inputDefaults: inputDefaults } as Modal<
        unknown,
        unknown,
        Record<string, unknown>
      >;
    },
    server(
      render: (input: unknown) => Promise<unknown>,
      options?: { defaultValues?: Record<string, unknown> },
    ) {
      const inputDefaults = options?.defaultValues ?? {};
      return {
        _type: "serverModal",
        _action: render,
        _inputDefaults: inputDefaults,
      } as ServerModal<unknown, unknown, Record<string, unknown>>;
    },
  } as ModalBuilder<TInput, TOutput, TTemplateProps>;
}

export const modal: ModalBuilder<never, undefined> = createModalBuilder();

export type { CreateOptions, ModalBuilder, StandardSchemaV1 };
