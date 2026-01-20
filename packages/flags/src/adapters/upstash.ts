import type { Redis } from "@upstash/redis";
import type { FlagAdapter } from "../types";

export type { FlagAdapter };

export interface UpstashAdapterConfig {
  client: Redis;
  prefix?: string;
}

export function upstashAdapter(config: UpstashAdapterConfig): FlagAdapter {
  const { client, prefix = "flags:" } = config;

  return {
    async get(key, _context) {
      const value = await client.get<boolean>(`${prefix}${key}`);
      return value ?? null;
    },
    async set(key, value) {
      await client.set(`${prefix}${key}`, value);
    },
  };
}
