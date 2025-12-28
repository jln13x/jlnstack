import type { StandardSchemaV1 } from "@standard-schema/spec";
import type { Awaitable, Prettify } from "./types";

export interface MiddlewareResult<TCtx> {
  result: unknown;
  ctx: TCtx;
}

export type Middleware<TInput, TContext, TResult> = (args: {
  input: TInput;
  ctx: TContext;
  next: <T>(opts: { ctx: T }) => Awaitable<MiddlewareResult<T>>;
}) => Awaitable<MiddlewareResult<TResult>>;

export interface InternalMiddleware {
  id?: string;
  run: Middleware<any, any, any>;
}

export type InferMiddlewareOutput<T> = T extends Middleware<any, any, infer O>
  ? O
  : never;

export type InferMiddlewareArrayOutput<
  T extends readonly Middleware<any, any, any>[],
> = T extends readonly [infer First, ...infer Rest]
  ? First extends Middleware<any, any, infer O>
    ? Rest extends readonly Middleware<any, any, any>[]
      ? Prettify<O & InferMiddlewareArrayOutput<Rest>>
      : O
    : never
  : {};

export type InferMiddlewareArrayInput<
  T extends readonly Middleware<any, any, any>[],
> = T extends readonly [infer First, ...infer Rest]
  ? First extends Middleware<infer I, any, any>
    ? Rest extends readonly Middleware<any, any, any>[]
      ? MergeInput<I, InferMiddlewareArrayInput<Rest>>
      : I
    : never
  : Record<string, never>;

export type MergeInput<A, B> = Prettify<
  (A extends Record<string, never> | undefined ? {} : A) &
    (B extends Record<string, never> | undefined ? {} : B)
>;

export interface ProcedureBuilder<TContext, TInput = Record<string, never>> {
  use<TInputExt, TMiddleware extends Middleware<TInputExt, TContext, any>>(
    middleware: TMiddleware,
  ): ProcedureBuilder<
    InferMiddlewareOutput<TMiddleware>,
    MergeInput<TInput, TInputExt>
  >;

  use<TMiddlewares extends readonly Middleware<any, TContext, any>[]>(
    middlewares: [...TMiddlewares],
  ): ProcedureBuilder<
    InferMiddlewareArrayOutput<TMiddlewares>,
    MergeInput<TInput, InferMiddlewareArrayInput<TMiddlewares>>
  >;

  input<TSchema extends StandardSchemaV1>(
    schema: TSchema,
  ): ProcedureBuilder<
    TContext,
    MergeInput<TInput, StandardSchemaV1.InferInput<TSchema>>
  >;

  run: Run<TContext, TInput>;
}

type IsPartialObject<T> = T extends object
  ? {} extends T
    ? true
    : false
  : false;

export type Run<
  TContext,
  TInput = Record<string, never>,
  TResultConstraint = unknown,
> = <TResult extends TResultConstraint>(
  fn: (args: { input: TInput; ctx: TContext }) => Awaitable<TResult>,
) => TInput extends Record<string, never> | undefined
  ? () => Promise<TResult>
  : IsPartialObject<TInput> extends true
    ? (input?: TInput) => Promise<TResult>
    : (input: TInput) => Promise<TResult>;

export type ProcedureBuilderFactory = (
  mws: InternalMiddleware[],
  factory?: ProcedureBuilderFactory,
) => ProcedureBuilder<any, any>;

export const createProcedureBuilder = <
  TContext,
  TInput = Record<string, never>,
>(
  middlewares: InternalMiddleware[],
  factory?: ProcedureBuilderFactory,
): ProcedureBuilder<TContext, TInput> => {
  const create = factory ?? createProcedureBuilder;

  const builder: ProcedureBuilder<TContext, TInput> = {
    use: (middleware: any) => {
      if (Array.isArray(middleware)) {
        const combined: Middleware<any, any, any> = async ({
          input,
          ctx,
          next,
        }) => {
          const results = await Promise.all(
            middleware.map((mw) =>
              mw({
                input,
                ctx,
                next: <T>(opts: { ctx: T }) =>
                  Promise.resolve({ result: undefined, ctx: opts.ctx }),
              }),
            ),
          );
          const mergedCtx = results.reduce(
            // biome-ignore lint/performance/noAccumulatingSpread: idc
            (acc, r) => ({ ...acc, ...r.ctx }),
            ctx,
          );
          return next({ ctx: mergedCtx });
        };
        return create([...middlewares, { run: combined }], factory);
      }

      return create([...middlewares, { run: middleware }], factory);
    },

    input(schema: any) {
      return create([createInputMiddleware(schema), ...middlewares], factory);
    },

    run(fn: any) {
      return (async (input?: TInput) => {
        const executeProcedure = async (
          index: number,
          ctx: unknown,
        ): Promise<MiddlewareResult<any>> => {
          if (index >= middlewares.length) {
            return Promise.resolve(fn({ ctx, input })).then((result) => ({
              result,
              ctx,
            }));
          }

          const mw = middlewares[index];
          if (!mw) {
            return Promise.resolve(fn({ ctx, input })).then((result) => ({
              result,
              ctx,
            }));
          }

          return Promise.resolve(
            mw.run({
              input,
              ctx,
              next: <T>(opts: { ctx: T }) => {
                return executeProcedure(index + 1, {
                  ...(ctx ?? {}),
                  ...opts.ctx,
                }).then((result) => ({
                  ...result,
                  ctx: opts.ctx,
                })) as Promise<MiddlewareResult<T>>;
              },
            }),
          );
        };

        const { result } = await executeProcedure(0, undefined);
        return result;
      }) as any;
    },
  };

  return builder;
};

function createInputMiddleware<TSchema extends StandardSchemaV1>(
  schema: TSchema,
) {
  return createMiddleware("INPUT_VALIDATION", async (opts) => {
    const result = await schema["~standard"].validate(opts.input);
    if (result.issues) {
      throw new Error("Input validation failed");
    }
    return opts.next({ ctx: opts.ctx });
  });
}

export const createMiddleware = <TInput, TContext>(
  id: string,
  fn: Middleware<TInput, TContext, any>,
): InternalMiddleware => ({
  id,
  run: fn,
});
