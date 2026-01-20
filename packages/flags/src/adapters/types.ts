import type { EvaluationContext, FlagsAdapter } from "../types";

export type { FlagsAdapter } from "../types";

/**
 * Configuration for Redis adapter
 */
export interface RedisAdapterConfig {
  /** ioredis client instance */
  client: import("ioredis").Redis;
}

/**
 * Configuration for Upstash adapter
 */
export interface UpstashAdapterConfig {
  /** @upstash/redis client instance */
  client: import("@upstash/redis").Redis;
}

/**
 * Configuration for memory adapter (testing)
 */
export interface MemoryAdapterConfig {
  /** Initial flag values */
  initialValues?: Record<string, string>;
}
