import {
  createMiddleware,
  createProcedureBuilder,
  type Middleware,
  type ProcedureBuilder,
} from "./core-internal";
import type { Awaitable } from "./types";

export interface InitOptions<TContext> {
  ctx: () => Awaitable<TContext>;
}

export interface ProcedureFactory<TContext> {
  middleware: <TInput, TResult>(
    fn: Middleware<TInput, TContext, TResult>,
  ) => Middleware<TInput, TContext, TResult>;
  procedure: ProcedureBuilder<TContext>;
}

export const init = <TContext>(
  options: InitOptions<TContext>,
): ProcedureFactory<TContext> => ({
  middleware: (fn) => fn,
  procedure: createProcedureBuilder([
    createMiddleware("INITIAL_CONTEXT", async ({ next }) => {
      return next({ ctx: await options.ctx() });
    }),
  ]),
});
