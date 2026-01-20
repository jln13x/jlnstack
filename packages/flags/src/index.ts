export type { MemoryAdapterConfig } from "./adapters/memory";
export { memoryAdapter } from "./adapters/memory";
export type { FlagAdapter } from "./types";

export interface FlagsConfig<
  TFlags extends readonly string[],
  TContext = undefined,
> {
  flags: TFlags;
  adapter: import("./types").FlagAdapter;
  defaultValue?: boolean;
  context?: TContext;
}

type ContextArgs<TContext> = TContext extends undefined
  ? []
  : [context: TContext];

export interface Flags<TFlags extends readonly string[], TContext = undefined> {
  definitions: TFlags;
  isEnabled(
    flag: TFlags[number],
    ...args: ContextArgs<TContext>
  ): Promise<boolean>;
  getAll(
    ...args: ContextArgs<TContext>
  ): Promise<Record<TFlags[number], boolean>>;
  set?(flag: TFlags[number], value: boolean): Promise<void>;
}

export function createFlags<
  const TFlags extends readonly string[],
  TContext = undefined,
>(config: FlagsConfig<TFlags, TContext>): Flags<TFlags, TContext> {
  const { flags, adapter, defaultValue = false } = config;

  const result = {
    definitions: flags,
    async isEnabled(flag: TFlags[number], ...args: ContextArgs<TContext>) {
      const context = args[0];
      const value = await adapter.get(flag, context);
      return value ?? defaultValue;
    },
    async getAll(...args: ContextArgs<TContext>) {
      const context = args[0];
      const results = await Promise.all(
        flags.map(async (flag) => {
          const value = await adapter.get(flag, context);
          return [flag, value ?? defaultValue] as const;
        }),
      );
      return Object.fromEntries(results) as Record<TFlags[number], boolean>;
    },
  } as Flags<TFlags, TContext>;

  if (adapter.set) {
    result.set = async (flag, value) => {
      await adapter.set!(flag, value);
    };
  }

  return result;
}
