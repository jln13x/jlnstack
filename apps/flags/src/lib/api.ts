import type { Connection } from "./connection";

export interface FlagsResponse {
  definitions: readonly string[];
  values: Record<string, boolean>;
}

export class FlagsApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "FlagsApiError";
  }
}

export async function fetchFlags(connection: Connection): Promise<FlagsResponse> {
  const res = await fetch(connection.endpoint, {
    headers: {
      Authorization: `Bearer ${connection.secret}`,
    },
  });

  if (!res.ok) {
    throw new FlagsApiError(
      `Failed to fetch flags: ${res.status} ${res.statusText}`,
      res.status,
    );
  }

  return res.json() as Promise<FlagsResponse>;
}

export async function updateFlag(
  connection: Connection,
  flag: string,
  value: boolean,
): Promise<void> {
  const res = await fetch(connection.endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${connection.secret}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ flag, value }),
  });

  if (!res.ok) {
    throw new FlagsApiError(
      `Failed to update flag: ${res.status} ${res.statusText}`,
      res.status,
    );
  }
}
