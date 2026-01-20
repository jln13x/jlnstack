/**
 * Flag value types supported
 */
export type FlagValue = boolean | string | number | object;

/**
 * Definition of a single feature flag
 */
export interface FlagDefinition<T extends FlagValue = boolean> {
  /** Default value when flag is not found or evaluation fails */
  defaultValue: T;
  /** Optional description for documentation */
  description?: string;
}

/**
 * Configuration for all flags - keys become the flag names
 */
export type FlagConfig<
  TFlags extends Record<string, FlagDefinition<FlagValue>>,
> = TFlags;

/**
 * Extract flag names from config
 */
export type FlagNames<
  TConfig extends FlagConfig<Record<string, FlagDefinition<FlagValue>>>,
> = keyof TConfig & string;

/**
 * Extract the value type for a specific flag
 */
export type FlagValueType<
  TConfig extends FlagConfig<Record<string, FlagDefinition<FlagValue>>>,
  K extends FlagNames<TConfig>,
> = TConfig[K]["defaultValue"];

/**
 * Context passed during flag evaluation (userId, environment, etc.)
 */
export interface EvaluationContext {
  /** User identifier for user-targeted flags */
  userId?: string;
  /** Environment identifier (production, staging, dev) */
  environment?: string;
  /** Custom attributes for advanced targeting */
  attributes?: Record<string, unknown>;
}

/**
 * Options for cache configuration
 */
export interface CacheOptions {
  /** Enable caching (default: true) */
  enabled?: boolean;
  /** Cache TTL in milliseconds (default: 60000 - 1 minute) */
  ttlMs?: number;
}

/**
 * Options for flag retrieval
 */
export interface GetFlagOptions {
  /** Skip cache and fetch fresh value */
  skipCache?: boolean;
  /** Evaluation context for targeted flags */
  context?: EvaluationContext;
}

/**
 * Result of flag evaluation including metadata
 */
export interface FlagResult<T extends FlagValue> {
  /** The evaluated flag value */
  value: T;
  /** Whether the value came from the adapter or is the default */
  source: "adapter" | "default" | "cache";
  /** Timestamp of when this value was fetched/cached */
  fetchedAt: number;
}

/**
 * Core flags client interface returned by createFlags
 */
export interface FlagsClient<
  TConfig extends FlagConfig<Record<string, FlagDefinition<FlagValue>>>,
> {
  /**
   * Check if a boolean flag is enabled
   * @param name Flag name
   * @param options Optional retrieval options
   */
  isEnabled<K extends FlagNames<TConfig>>(
    name: K,
    options?: GetFlagOptions,
  ): Promise<TConfig[K]["defaultValue"] extends boolean ? boolean : never>;

  /**
   * Get a flag's value with full type inference
   * @param name Flag name
   * @param options Optional retrieval options
   */
  get<K extends FlagNames<TConfig>>(
    name: K,
    options?: GetFlagOptions,
  ): Promise<FlagValueType<TConfig, K>>;

  /**
   * Get a flag's value with metadata
   * @param name Flag name
   * @param options Optional retrieval options
   */
  getWithDetails<K extends FlagNames<TConfig>>(
    name: K,
    options?: GetFlagOptions,
  ): Promise<FlagResult<FlagValueType<TConfig, K>>>;

  /**
   * Get all flags at once
   * @param options Optional retrieval options
   */
  getAll(options?: GetFlagOptions): Promise<{
    [K in FlagNames<TConfig>]: FlagValueType<TConfig, K>;
  }>;

  /**
   * Set a flag's value (for admin/management purposes)
   * @param name Flag name
   * @param value Flag value
   * @param context Optional context for user-specific overrides
   */
  set<K extends FlagNames<TConfig>>(
    name: K,
    value: FlagValueType<TConfig, K>,
    context?: EvaluationContext,
  ): Promise<void>;

  /**
   * Delete a flag's value (revert to default)
   * @param name Flag name
   * @param context Optional context to delete specific override
   */
  delete<K extends FlagNames<TConfig>>(
    name: K,
    context?: EvaluationContext,
  ): Promise<void>;

  /**
   * Clear the cache
   */
  clearCache(): void;

  /**
   * Get the flag configuration (for debugging/introspection)
   */
  readonly config: TConfig;
}

/**
 * Adapter interface for flag storage backends
 */
export interface FlagsAdapter {
  /**
   * Retrieve a flag value from storage
   * @param key The storage key (includes prefix)
   * @param context Optional evaluation context
   * @returns The raw value or undefined if not found
   */
  get(key: string, context?: EvaluationContext): Promise<string | undefined>;

  /**
   * Store a flag value
   * @param key The storage key (includes prefix)
   * @param value The serialized value
   * @param context Optional evaluation context for user-specific storage
   */
  set(key: string, value: string, context?: EvaluationContext): Promise<void>;

  /**
   * Delete a flag value
   * @param key The storage key
   * @param context Optional context for specific override deletion
   */
  delete(key: string, context?: EvaluationContext): Promise<void>;

  /**
   * Get multiple flag values at once (optional optimization)
   * @param keys Array of storage keys
   * @param context Optional evaluation context
   * @returns Map of key to value
   */
  getMany?(
    keys: string[],
    context?: EvaluationContext,
  ): Promise<Map<string, string | undefined>>;

  /**
   * Disconnect/cleanup (optional)
   */
  disconnect?(): Promise<void>;
}

/**
 * Configuration for createFlags factory
 */
export interface CreateFlagsConfig<
  TConfig extends FlagConfig<Record<string, FlagDefinition<FlagValue>>>,
> {
  /** Flag definitions */
  flags: TConfig;
  /** Storage adapter */
  adapter: FlagsAdapter;
  /** Key prefix for storage (default: "flags:") */
  prefix?: string;
  /** Cache options */
  cache?: CacheOptions;
}
