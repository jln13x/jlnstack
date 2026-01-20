"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { ConnectForm } from "@/components/connect-form";
import { FlagsList } from "@/components/flags-list";
import { useConnection } from "@/hooks/use-connection";
import { fetchFlags } from "@/lib/api";
import type { Connection } from "@/lib/connection";

export default function Home() {
  const { connection, connect, disconnect } = useConnection();
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  async function handleConnect(newConnection: Connection) {
    setIsConnecting(true);
    setConnectError(null);

    try {
      await fetchFlags(newConnection);
      connect(newConnection);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Failed to connect");
    } finally {
      setIsConnecting(false);
    }
  }

  return (
    <main className="container mx-auto max-w-2xl py-10 px-4">
      <div className="flex items-center gap-3 mb-8">
        <Flag className="h-8 w-8" />
        <h1 className="text-3xl font-bold">Flags Dashboard</h1>
      </div>

      {connection ? (
        <FlagsList connection={connection} onDisconnect={disconnect} />
      ) : (
        <ConnectForm
          onConnect={handleConnect}
          isConnecting={isConnecting}
          error={connectError}
        />
      )}
    </main>
  );
}
