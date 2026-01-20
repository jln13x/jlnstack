import type { Redis } from "ioredis";
import type { EvaluationContext, FlagsAdapter } from "../types";
import type { RedisAdapterConfig } from "./types";

export type { RedisAdapterConfig } from "./types";

/**
 * Create a Redis adapter for feature flags using ioredis
 */
export function createRedisAdapter(config: RedisAdapterConfig): FlagsAdapter {
  const { client } = config;

  return {
    async get(
      key: string,
      _context?: EvaluationContext,
    ): Promise<string | undefined> {
      const value = await client.get(key);
      return value ?? undefined;
    },

    async set(
      key: string,
      value: string,
      _context?: EvaluationContext,
    ): Promise<void> {
      await client.set(key, value);
    },

    async delete(
      key: string,
      _context?: EvaluationContext,
    ): Promise<void> {
      await client.del(key);
    },

    async getMany(
      keys: string[],
      _context?: EvaluationContext,
    ): Promise<Map<string, string | undefined>> {
      if (keys.length === 0) {
        return new Map();
      }

      const values = await client.mget(...keys);
      const result = new Map<string, string | undefined>();

      for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = values[i];
        if (key !== undefined) {
          result.set(key, value ?? undefined);
        }
      }

      return result;
    },

    async disconnect(): Promise<void> {
      await client.quit();
    },
  };
}
