export type AuditContext = {
  ip?: string;
  userAgent?: string;
  requestId?: string;
  [key: string]: unknown;
};

// Generic audit entry stored by adapters
export type AuditEntry<
  TActorType extends string = string,
  TEventType extends string = string,
  TEventData extends Record<string, unknown> = Record<string, unknown>,
> = {
  id: string;
  timestamp: Date;
  actor: {
    type: TActorType;
    id: string;
    metadata?: Record<string, unknown>;
  };
  event: {
    type: TEventType;
    data: TEventData;
  };
  metadata?: Record<string, unknown>;
  context?: AuditContext;
};

export type AuditAdapter = {
  add: (entry: AuditEntry) => Promise<void>;
};

export type BeforeLogHook<
  TActorType extends string = string,
  TEventType extends string = string,
  TEventData extends Record<string, unknown> = Record<string, unknown>,
> = (
  entry: AuditEntry<TActorType, TEventType, TEventData>
) => AuditEntry<TActorType, TEventType, TEventData> | Promise<AuditEntry<TActorType, TEventType, TEventData>>;
