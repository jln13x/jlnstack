import type { AuditAdapter, AuditContext, AuditEntry, BeforeLogHook } from "./types";

export type { AuditAdapter, AuditContext, AuditEntry, BeforeLogHook } from "./types";

// Events definition: map of event type -> event data shape
export type EventsDefinition = Record<string, Record<string, unknown>>;

export type AuditOptions<
  TActors extends readonly string[],
  TEvents extends EventsDefinition,
> = {
  adapter: AuditAdapter;
  actors: TActors;
  events: TEvents;
  generateId?: () => string;
  beforeLog?: BeforeLogHook;
};

export type AuditLogInput<
  TActors extends readonly string[],
  TEvents extends EventsDefinition,
  TEventType extends keyof TEvents & string,
> = {
  id?: string;
  timestamp?: Date;
  actor: {
    type: TActors[number];
    id: string;
    metadata?: Record<string, unknown>;
  };
  event: {
    type: TEventType;
    data: TEvents[TEventType];
  };
  metadata?: Record<string, unknown>;
  context?: AuditContext;
};

export type Audit<
  TActors extends readonly string[],
  TEvents extends EventsDefinition,
> = {
  log: <TEventType extends keyof TEvents & string>(
    input: AuditLogInput<TActors, TEvents, TEventType>
  ) => Promise<AuditEntry<TActors[number], TEventType, TEvents[TEventType]>>;
};

function defaultGenerateId(): string {
  return crypto.randomUUID();
}

export function createAudit<
  const TActors extends readonly string[],
  const TEvents extends EventsDefinition,
>(options: AuditOptions<TActors, TEvents>): Audit<TActors, TEvents> {
  const {
    adapter,
    actors: _actors,
    events: _events,
    generateId = defaultGenerateId,
    beforeLog,
  } = options;

  async function log<TEventType extends keyof TEvents & string>(
    input: AuditLogInput<TActors, TEvents, TEventType>
  ): Promise<AuditEntry<TActors[number], TEventType, TEvents[TEventType]>> {
    let entry: AuditEntry<TActors[number], TEventType, TEvents[TEventType]> = {
      id: input.id ?? generateId(),
      timestamp: input.timestamp ?? new Date(),
      actor: input.actor,
      event: input.event,
      metadata: input.metadata,
      context: input.context,
    };

    if (beforeLog) {
      entry = (await beforeLog(entry as AuditEntry)) as AuditEntry<
        TActors[number],
        TEventType,
        TEvents[TEventType]
      >;
    }

    await adapter.add(entry as AuditEntry);

    return entry;
  }

  return { log };
}
