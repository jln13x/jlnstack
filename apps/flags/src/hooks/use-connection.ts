"use client";

import { useCallback, useState } from "react";
import type { Connection } from "@/lib/connection";

export function useConnection() {
  const [connection, setConnection] = useState<Connection | null>(null);

  const connect = useCallback((newConnection: Connection) => {
    setConnection(newConnection);
  }, []);

  const disconnect = useCallback(() => {
    setConnection(null);
  }, []);

  return {
    connection,
    isConnected: !!connection,
    connect,
    disconnect,
  };
}
