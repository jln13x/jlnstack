import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { init as coreInit, type InitOptions } from "./core";
import {
  createMiddleware,
  createProcedureBuilder,
  type InferMiddlewareArrayInput,
  type InferMiddlewareArrayOutput,
  type InferMiddlewareOutput,
  type InternalMiddleware,
  type MergeInput,
  type Middleware,
  type ProcedureBuilderFactory,
  type Run,
} from "./core-internal";
import type { Prettify } from "./types";

type ExtractParams<TInput> = TInput extends { params: infer P } ? P : never;

interface NextProcedureBuilder<TContext, TInput = {}> {
  use<TInputExt, TMiddleware extends Middleware<TInputExt, TContext, any>>(
    middleware: TMiddleware,
  ): NextProcedureBuilder<
    InferMiddlewareOutput<TMiddleware>,
    MergeInput<TInput, TInputExt>
  >;

  use<TMiddlewares extends readonly Middleware<any, TContext, any>[]>(
    middlewares: [...TMiddlewares],
  ): NextProcedureBuilder<
    InferMiddlewareArrayOutput<TMiddlewares>,
    MergeInput<TInput, InferMiddlewareArrayInput<TMiddlewares>>
  >;

  input<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): NextProcedureBuilder<
    TContext,
    TInput & StandardSchemaV1.InferInput<TSchema>
  >;

  params<T, TSchema extends StandardSchemaV1 | undefined = undefined>(
    schema?: TSchema,
  ): NextProcedureBuilder<
    Prettify<
      TContext & {
        params: TSchema extends StandardSchemaV1
          ? StandardSchemaV1.InferOutput<TSchema>
          : T;
      }
    >,
    Prettify<
      TInput & {
        params: Promise<
          TSchema extends StandardSchemaV1
            ? StandardSchemaV1.InferOutput<TSchema>
            : T
        >;
      }
    >
  >;

  searchParams<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): NextProcedureBuilder<
    Prettify<
      TContext & { searchParams: StandardSchemaV1.InferOutput<TSchema> }
    >,
    Prettify<
      TInput & {
        searchParams: Promise<Record<string, string | string[] | undefined>>;
      }
    >
  >;

  run: Run<TContext, TInput>;
  page: Run<
    TContext,
    Prettify<
      TInput & {
        searchParams: Promise<Record<string, string | string[] | undefined>>;
        params: Promise<{ [key: string]: string }>;
      }
    >,
    ReactNode
  >;
  rsc: Run<TContext, TInput, ReactNode>;
  metadata: Run<TContext, TInput, Metadata>;
  layout: Run<TContext, TInput & { children: ReactNode }, ReactNode>;
  layoutMetadata: Run<
    Prettify<Omit<TContext, "searchParams">>,
    Prettify<Omit<TInput, "searchParams">>,
    Metadata
  >;

  staticParams: Run<TContext, TInput, ExtractParams<TContext>[]>;
}

const createNextBuilder: ProcedureBuilderFactory = (
  middlewares: InternalMiddleware[],
  factory?: ProcedureBuilderFactory,
) => {
  const core = createProcedureBuilder(
    middlewares,
    factory ?? createNextBuilder,
  );

  return {
    ...core,

    params() {
      const mw = createMiddleware(
        "NEXT_PARAMS",
        async ({ input, ctx, next }: any) => {
          const params = await input.params;

          return next({ ctx: { ...ctx, params } });
        },
      );
      return createNextBuilder([...middlewares, mw], factory) as any;
    },

    searchParams(schema: StandardSchemaV1) {
      const mw = createMiddleware(
        "NEXT_SEARCH_PARAMS",
        async ({ input, ctx, next }: any) => {
          const searchParams = await input.searchParams;

          const result = await schema["~standard"].validate(searchParams);
          if (result.issues) throw new Error("Invalid search params");
          return next({ ctx: { ...ctx, searchParams: result.value } });
        },
      );
      return createNextBuilder([...middlewares, mw], factory) as any;
    },

    page: core.run,
    rsc: core.run,
    metadata: core.run,
    layout: core.run,
    layoutMetadata: core.run,
    staticParams: core.run,
  } as any;
};

export const init = <TContext>(options: InitOptions<TContext>) => {
  const core = coreInit(options);
  const initialMiddlewares: InternalMiddleware[] = [
    createMiddleware("INITIAL_CONTEXT", async ({ next }: any) => {
      return next({ ctx: await options.ctx() });
    }),
  ];

  return {
    middleware: core.middleware,
    procedure: createNextBuilder(
      initialMiddlewares,
    ) as unknown as NextProcedureBuilder<TContext>,
  };
};
