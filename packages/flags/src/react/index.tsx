import type { ReactNode } from "react";
import type { Flags } from "../index";
import { FlagsClientProvider, useFlagsInternal } from "./client";

type ProviderProps<TContext> = TContext extends undefined
  ? { children: ReactNode }
  : { children: ReactNode; context: TContext };

export function createFlagsReact<
  const TFlags extends readonly string[],
  TContext = undefined,
>(flags: Flags<TFlags, TContext>) {
  type FlagValues = Record<TFlags[number], boolean>;

  async function FlagsProvider(props: ProviderProps<TContext>) {
    const context = "context" in props ? props.context : undefined;
    const value = await (flags.getAll as (ctx?: unknown) => Promise<FlagValues>)(
      context,
    );
    return (
      <FlagsClientProvider value={value}>{props.children}</FlagsClientProvider>
    );
  }

  function useFlags(): FlagValues {
    return useFlagsInternal() as FlagValues;
  }

  return { FlagsProvider, useFlags };
}
