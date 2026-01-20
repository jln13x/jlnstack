import type { Redis } from "ioredis";
import type { FlagAdapter } from "../types";

export type { FlagAdapter };

export interface RedisAdapterConfig {
  client: Redis;
  prefix?: string;
}

export function redisAdapter(config: RedisAdapterConfig): FlagAdapter {
  const { client, prefix = "flags:" } = config;

  return {
    async get(key, _context) {
      const value = await client.get(`${prefix}${key}`);
      if (value === null) return null;
      return value === "true" || value === "1";
    },
    async set(key, value) {
      await client.set(`${prefix}${key}`, value ? "true" : "false");
    },
  };
}
