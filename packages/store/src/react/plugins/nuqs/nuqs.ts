import { type Options, type UseQueryStatesKeysMap, useQueryStates } from "nuqs";
import { useEffect } from "react";
import type { StoreApi } from "../../../core/types";
import type { ReactPluginResult } from "../../react";

type InferParserType<T> = T extends { parse: (v: string) => infer R }
  ? R
  : never;

type InferParsersType<T extends UseQueryStatesKeysMap> = {
  [K in keyof T]: InferParserType<T[K]>;
};

export function nuqs<
  TState extends object,
  TParsers extends UseQueryStatesKeysMap,
>(parsers: TParsers, options?: Options) {
  return (store: StoreApi<TState>): ReactPluginResult => {
    return {
      id: "nuqs" as const,
      useHook: () => {
        const [queryState, setQueryState] = useQueryStates(parsers, options);

        useEffect(() => {
          const partial: Partial<TState> = {};
          for (const key of Object.keys(parsers) as (keyof TParsers &
            keyof TState)[]) {
            if (queryState[key] !== undefined) {
              partial[key] = queryState[key] as TState[typeof key];
            }
          }
          if (Object.keys(partial).length > 0) {
            store.setState((state) => ({ ...state, ...partial }));
          }
        }, [queryState, parsers, store.setState]);

        useEffect(() => {
          return store.subscribe(() => {
            const state = store.getState();
            const updates: Partial<InferParsersType<TParsers>> = {};
            for (const key of Object.keys(parsers) as (keyof TParsers &
              keyof TState)[]) {
              updates[key] = state[
                key
              ] as InferParsersType<TParsers>[typeof key];
            }
            setQueryState(updates);
          });
        }, [setQueryState, parsers, store.subscribe, store.getState]);

        return queryState as InferParsersType<TParsers>;
      },
    };
  };
}
