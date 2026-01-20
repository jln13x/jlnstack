import type { AuditAdapter, AuditEntry } from "../types";

export type ConsoleAdapterOptions = {
  prefix?: string;
  logger?: Pick<Console, "log">;
};

export function consoleAdapter(options: ConsoleAdapterOptions = {}): AuditAdapter {
  const { prefix = "[audit]", logger = console } = options;

  return {
    add: async (entry: AuditEntry) => {
      const message = `${prefix} ${entry.event.type} by ${entry.actor.type}:${entry.actor.id}`;
      logger.log(message, {
        id: entry.id,
        timestamp: entry.timestamp.toISOString(),
        eventData: entry.event.data,
        metadata: entry.metadata,
        context: entry.context,
      });
    },
  };
}
