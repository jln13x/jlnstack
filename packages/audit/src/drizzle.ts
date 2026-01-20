import type { AuditAdapter, AuditEntry } from "./types";

/**
 * Creates a Drizzle adapter for audit logging.
 *
 * @example
 * ```ts
 * // Define your table (using the recommended schema)
 * const auditLogs = pgTable("audit_logs", {
 *   id: text("id").primaryKey(),
 *   timestamp: timestamp("timestamp").notNull(),
 *   actorType: text("actor_type").notNull(),
 *   actorId: text("actor_id").notNull(),
 *   actorMetadata: jsonb("actor_metadata"),
 *   eventType: text("event_type").notNull(),
 *   eventData: jsonb("event_data").notNull(),
 *   metadata: jsonb("metadata"),
 *   context: jsonb("context"),
 * });
 *
 * // Create the adapter
 * const adapter = drizzleAdapter(db, auditLogs);
 * ```
 */
export function drizzleAdapter<
  TDb extends { insert: (table: TTable) => { values: (values: unknown) => Promise<unknown> } },
  TTable,
>(db: TDb, table: TTable): AuditAdapter {
  return {
    add: async (entry: AuditEntry) => {
      await db.insert(table).values({
        id: entry.id,
        timestamp: entry.timestamp,
        actorType: entry.actor.type,
        actorId: entry.actor.id,
        actorMetadata: entry.actor.metadata ?? null,
        eventType: entry.event.type,
        eventData: entry.event.data,
        metadata: entry.metadata ?? null,
        context: entry.context ?? null,
      });
    },
  };
}

/**
 * Recommended column names for your audit log table.
 * Use this as a reference when defining your Drizzle table.
 *
 * @example PostgreSQL
 * ```ts
 * import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
 *
 * export const auditLogs = pgTable("audit_logs", {
 *   id: text("id").primaryKey(),
 *   timestamp: timestamp("timestamp").notNull(),
 *   actorType: text("actor_type").notNull(),
 *   actorId: text("actor_id").notNull(),
 *   actorMetadata: jsonb("actor_metadata"),
 *   eventType: text("event_type").notNull(),
 *   eventData: jsonb("event_data").notNull(),
 *   metadata: jsonb("metadata"),
 *   context: jsonb("context"),
 * });
 * ```
 *
 * @example SQLite
 * ```ts
 * import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
 *
 * export const auditLogs = sqliteTable("audit_logs", {
 *   id: text("id").primaryKey(),
 *   timestamp: integer("timestamp", { mode: "timestamp" }).notNull(),
 *   actorType: text("actor_type").notNull(),
 *   actorId: text("actor_id").notNull(),
 *   actorMetadata: text("actor_metadata", { mode: "json" }),
 *   eventType: text("event_type").notNull(),
 *   eventData: text("event_data", { mode: "json" }).notNull(),
 *   metadata: text("metadata", { mode: "json" }),
 *   context: text("context", { mode: "json" }),
 * });
 * ```
 */
export const AUDIT_TABLE_COLUMNS = {
  id: "id",
  timestamp: "timestamp",
  actorType: "actor_type",
  actorId: "actor_id",
  actorMetadata: "actor_metadata",
  eventType: "event_type",
  eventData: "event_data",
  metadata: "metadata",
  context: "context",
} as const;
