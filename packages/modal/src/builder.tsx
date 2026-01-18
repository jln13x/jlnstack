import { lazy, Suspense, type ComponentType, type ReactNode } from "react";
import type {
  Modal,
  ModalComponentOptions,
  ModalDef,
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

type LazyOptions<TInput, TTemplateProps> = CreateOptions<TInput, TTemplateProps> & {
  fallback?: ReactNode;
};

type LazyModalComponent<TInput, TOutput> = ComponentType<
  TInput & ModalComponentOptions<TOutput>
>;

type LazyImport<TInput, TOutput> = () => Promise<{
  default: LazyModalComponent<TInput, TOutput>;
}>;

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
  lazy: [TInput] extends [never]
    ? <I, TDefaults extends Partial<I> = {}>(
        importFn: LazyImport<I, TOutput>,
        options?: LazyOptions<I, TTemplateProps> & {
          defaultValues?: { modal?: TDefaults };
        },
      ) => Modal<I, TOutput, TDefaults>
    : <TDefaults extends Partial<TInput> = {}>(
        importFn: LazyImport<TInput, TOutput>,
        options?: LazyOptions<TInput, TTemplateProps> & {
          defaultValues?: { modal?: TDefaults };
        },
      ) => Modal<TInput, TOutput, TDefaults>;
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
      return { _def: def, _inputDefaults: inputDefaults } as Modal<
        unknown,
        unknown,
        Record<string, unknown>
      >;
    },
    lazy(
      importFn: () => Promise<{ default: ComponentType<unknown> }>,
      options?: {
        fallback?: ReactNode;
        defaultValues?: {
          template?: Record<string, unknown>;
          modal?: Record<string, unknown>;
        };
      },
    ) {
      const LazyComponent = lazy(importFn);
      const inputDefaults = options?.defaultValues?.modal ?? {};
      const templateProps = options?.defaultValues?.template ?? {};
      const fallback = options?.fallback ?? null;

      const def: ModalDef<unknown, unknown> = {
        component: (input, opts) => {
          const mergedInput = {
            ...inputDefaults,
            ...(input as Record<string, unknown>),
          };

          const content = (
            <Suspense fallback={fallback}>
              <LazyComponent {...mergedInput} {...opts} />
            </Suspense>
          );

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
      return { _def: def, _inputDefaults: inputDefaults } as Modal<
        unknown,
        unknown,
        Record<string, unknown>
      >;
    },
  } as ModalBuilder<TInput, TOutput, TTemplateProps>;
}

export const modal: ModalBuilder<never, undefined> = createModalBuilder();

export type {
  CreateOptions,
  LazyImport,
  LazyModalComponent,
  LazyOptions,
  ModalBuilder,
  StandardSchemaV1,
};
