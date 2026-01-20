import type {
  CacheOptions,
  CreateFlagsConfig,
  EvaluationContext,
  FlagConfig,
  FlagDefinition,
  FlagNames,
  FlagResult,
  FlagsAdapter,
  FlagsClient,
  FlagValue,
  FlagValueType,
  GetFlagOptions,
} from "./types";

export type {
  CacheOptions,
  CreateFlagsConfig,
  EvaluationContext,
  FlagConfig,
  FlagDefinition,
  FlagNames,
  FlagResult,
  FlagsAdapter,
  FlagsClient,
  FlagValue,
  FlagValueType,
  GetFlagOptions,
} from "./types";

// JSON serializer for flag values
const jsonSerializer = {
  serialize: (value: unknown): string => JSON.stringify(value),
  deserialize: (raw: string): unknown => {
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  },
};

// Build storage key with context
function buildKey(
  prefix: string,
  flagName: string,
  context?: EvaluationContext,
): string {
  let key = `${prefix}${flagName}`;

  // User-specific key takes precedence
  if (context?.userId) {
    key = `${prefix}user:${context.userId}:${flagName}`;
  } else if (context?.environment) {
    key = `${prefix}env:${context.environment}:${flagName}`;
  }

  return key;
}

// Cache implementation
interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

function createCache<T>(ttlMs: number) {
  const cache = new Map<string, CacheEntry<T>>();

  return {
    get(key: string): T | undefined {
      const entry = cache.get(key);
      if (!entry) return undefined;
      if (Date.now() > entry.expiresAt) {
        cache.delete(key);
        return undefined;
      }
      return entry.value;
    },
    set(key: string, value: T): void {
      cache.set(key, {
        value,
        expiresAt: Date.now() + ttlMs,
      });
    },
    delete(key: string): void {
      cache.delete(key);
    },
    clear(): void {
      cache.clear();
    },
  };
}

/**
 * Create a type-safe feature flags client
 */
export function createFlags<
  TConfig extends FlagConfig<Record<string, FlagDefinition<FlagValue>>>,
>(config: CreateFlagsConfig<TConfig>): FlagsClient<TConfig> {
  const {
    flags,
    adapter,
    prefix = "flags:",
    cache: cacheOptions = {},
  } = config;

  const { enabled: cacheEnabled = true, ttlMs = 60000 } = cacheOptions;
  const cache = cacheEnabled
    ? createCache<FlagResult<FlagValue>>(ttlMs)
    : null;

  // Get a single flag value
  async function getFlagValue<K extends FlagNames<TConfig>>(
    name: K,
    options?: GetFlagOptions,
  ): Promise<FlagResult<FlagValueType<TConfig, K>>> {
    const flagDef = flags[name];
    if (!flagDef) {
      throw new Error(`Unknown flag: ${String(name)}`);
    }

    const key = buildKey(prefix, String(name), options?.context);
    const now = Date.now();

    // Check cache first
    if (cache && !options?.skipCache) {
      const cached = cache.get(key);
      if (cached) {
        return {
          ...cached,
          source: "cache",
        } as FlagResult<FlagValueType<TConfig, K>>;
      }
    }

    // Fetch from adapter
    const raw = await adapter.get(key, options?.context);

    let value: FlagValueType<TConfig, K>;
    let source: "adapter" | "default" = "default";

    if (raw !== undefined) {
      const parsed = jsonSerializer.deserialize(raw);
      value = parsed as FlagValueType<TConfig, K>;
      source = "adapter";
    } else {
      // Fall back to default
      value = flagDef.defaultValue as FlagValueType<TConfig, K>;
    }

    const result: FlagResult<FlagValueType<TConfig, K>> = {
      value,
      source,
      fetchedAt: now,
    };

    // Cache the result
    if (cache) {
      cache.set(key, result);
    }

    return result;
  }

  return {
    async isEnabled<K extends FlagNames<TConfig>>(
      name: K,
      options?: GetFlagOptions,
    ): Promise<TConfig[K]["defaultValue"] extends boolean ? boolean : never> {
      const flagDef = flags[name];
      if (typeof flagDef?.defaultValue !== "boolean") {
        throw new Error(
          `isEnabled can only be used with boolean flags. Flag "${String(name)}" is not a boolean flag.`,
        );
      }
      const result = await getFlagValue(name, options);
      return result.value as TConfig[K]["defaultValue"] extends boolean
        ? boolean
        : never;
    },

    async get<K extends FlagNames<TConfig>>(
      name: K,
      options?: GetFlagOptions,
    ): Promise<FlagValueType<TConfig, K>> {
      const result = await getFlagValue(name, options);
      return result.value;
    },

    async getWithDetails<K extends FlagNames<TConfig>>(
      name: K,
      options?: GetFlagOptions,
    ): Promise<FlagResult<FlagValueType<TConfig, K>>> {
      return getFlagValue(name, options);
    },

    async getAll(
      options?: GetFlagOptions,
    ): Promise<{ [K in FlagNames<TConfig>]: FlagValueType<TConfig, K> }> {
      const flagNames = Object.keys(flags) as FlagNames<TConfig>[];

      // Use batch get if adapter supports it
      if (adapter.getMany) {
        const keys = flagNames.map((name) =>
          buildKey(prefix, String(name), options?.context),
        );
        const values = await adapter.getMany(keys, options?.context);

        const result = {} as {
          [K in FlagNames<TConfig>]: FlagValueType<TConfig, K>;
        };

        for (const name of flagNames) {
          const key = buildKey(prefix, String(name), options?.context);
          const raw = values.get(key);
          const flagDef = flags[name];

          if (raw !== undefined) {
            const parsed = jsonSerializer.deserialize(raw);
            result[name] = parsed as FlagValueType<TConfig, typeof name>;
          } else {
            result[name] = flagDef.defaultValue as FlagValueType<
              TConfig,
              typeof name
            >;
          }
        }

        return result;
      }

      // Fallback to sequential gets
      const results = await Promise.all(
        flagNames.map(async (name) => {
          const result = await getFlagValue(name, options);
          return [name, result.value] as const;
        }),
      );

      return Object.fromEntries(results) as {
        [K in FlagNames<TConfig>]: FlagValueType<TConfig, K>;
      };
    },

    async set<K extends FlagNames<TConfig>>(
      name: K,
      value: FlagValueType<TConfig, K>,
      context?: EvaluationContext,
    ): Promise<void> {
      const flagDef = flags[name];
      if (!flagDef) {
        throw new Error(`Unknown flag: ${String(name)}`);
      }

      const key = buildKey(prefix, String(name), context);
      const serialized = jsonSerializer.serialize(value);
      await adapter.set(key, serialized, context);

      // Invalidate cache
      if (cache) {
        cache.delete(key);
      }
    },

    async delete<K extends FlagNames<TConfig>>(
      name: K,
      context?: EvaluationContext,
    ): Promise<void> {
      const key = buildKey(prefix, String(name), context);
      await adapter.delete(key, context);

      // Invalidate cache
      if (cache) {
        cache.delete(key);
      }
    },

    clearCache(): void {
      cache?.clear();
    },

    get config(): TConfig {
      return flags;
    },
  };
}
