"use client";

import { Loader2, RefreshCw, Unplug } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useFlags, useToggleFlag } from "@/hooks/use-flags";
import type { Connection } from "@/lib/connection";

interface FlagsListProps {
  connection: Connection;
  onDisconnect: () => void;
}

export function FlagsList({ connection, onDisconnect }: FlagsListProps) {
  const { data: flags, isLoading, error, refetch, isRefetching } = useFlags(connection);
  const toggleFlag = useToggleFlag(connection);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-6">
          <p className="text-sm text-destructive">{error.message}</p>
          <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground truncate max-w-md">
          Connected to {connection.endpoint}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isRefetching}
          >
            {isRefetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={onDisconnect}>
            <Unplug className="h-4 w-4" />
            Disconnect
          </Button>
        </div>
      </div>

      {toggleFlag.error && (
        <p className="text-sm text-destructive">{toggleFlag.error.message}</p>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>
            Toggle flags on and off. Changes are saved immediately.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {flags && flags.definitions.length === 0 ? (
            <p className="text-sm text-muted-foreground">No flags defined.</p>
          ) : (
            <div className="space-y-4">
              {flags?.definitions.map((flag) => {
                const isUpdating = toggleFlag.isPending && toggleFlag.variables?.flag === flag;
                return (
                  <div
                    key={flag}
                    className="flex items-center justify-between py-2 border-b last:border-0"
                  >
                    <code className="text-sm bg-muted px-2 py-1 rounded">{flag}</code>
                    <div className="flex items-center gap-2">
                      {isUpdating && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                      <Switch
                        checked={flags.values[flag] ?? false}
                        onCheckedChange={(value) => toggleFlag.mutate({ flag, value })}
                        disabled={isUpdating}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
