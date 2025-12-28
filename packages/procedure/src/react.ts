import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { ReactNode } from "react";
import { init as coreInit, type InitOptions } from "./core";
import {
  createMiddleware,
  createProcedureBuilder,
  type InferMiddlewareOutput,
  type InternalMiddleware,
  type MergeInput,
  type Middleware,
  type ProcedureBuilderFactory,
  type Run,
} from "./core-internal";

interface ReactProcedureBuilder<TContext, TInput = Record<string, never>> {
  use<TInputExt, TMiddleware extends Middleware<TInputExt, TContext, any>>(
    middleware: TMiddleware,
  ): ReactProcedureBuilder<
    InferMiddlewareOutput<TMiddleware>,
    MergeInput<TInput, TInputExt>
  >;

  input<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): ReactProcedureBuilder<
    TContext,
    MergeInput<TInput, StandardSchemaV1.InferInput<TSchema>>
  >;

  run: Run<TContext, TInput>;
  rsc: Run<TContext, TInput, ReactNode>;
  serverFn: Run<TContext, TInput>;
}

const createReactBuilder: ProcedureBuilderFactory = (
  middlewares: InternalMiddleware[],
  factory?: ProcedureBuilderFactory,
) => {
  const core = createProcedureBuilder(
    middlewares,
    factory ?? createReactBuilder,
  );

  return {
    ...core,
    rsc: core.run,
    serverFn: core.run,
  };
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
    procedure: createReactBuilder(initialMiddlewares) as ReactProcedureBuilder<
      TContext,
      Record<string, never>
    >,
  };
};
