"use client";

import { useState } from "react";
import { Check, Copy, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { generateSecret, type Connection } from "@/lib/connection";

interface ConnectFormProps {
  onConnect: (connection: Connection) => void;
  isConnecting: boolean;
  error: string | null;
}

export function ConnectForm({ onConnect, isConnecting, error }: ConnectFormProps) {
  const [endpoint, setEndpoint] = useState("");
  const [secret, setSecret] = useState("");
  const [copied, setCopied] = useState(false);

  function handleGenerateSecret() {
    const newSecret = generateSecret();
    setSecret(newSecret);
  }

  async function copySecret() {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onConnect({ endpoint, secret });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
              1
            </span>
            Generate a secret
          </CardTitle>
          <CardDescription>
            Generate a secret and add it to your app&apos;s flags handler.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!secret ? (
            <Button type="button" onClick={handleGenerateSecret}>
              <Sparkles className="h-4 w-4" />
              Generate Secret
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <code className="flex-1 bg-muted px-3 py-2 rounded-md text-sm font-mono break-all">
                  {secret}
                </code>
                <Button type="button" variant="outline" size="icon" onClick={copySecret}>
                  {copied ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              <div className="bg-muted/50 rounded-md p-3 text-sm">
                <p className="text-muted-foreground mb-2">Add this to your app:</p>
                <pre className="bg-background p-2 rounded text-xs overflow-x-auto">
{`import { createFlagsHandler } from "@jlnstack/flags/next";

export const { GET, POST, OPTIONS } = createFlagsHandler(flags, {
  secret: "${secret}",
});`}
                </pre>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={handleGenerateSecret}>
                <RefreshCw className="h-3 w-3" />
                Regenerate
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className={!secret ? "opacity-50 pointer-events-none" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs">
              2
            </span>
            Connect to your app
          </CardTitle>
          <CardDescription>
            Enter the URL where your flags handler is mounted.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="endpoint">API Endpoint</Label>
            <Input
              id="endpoint"
              placeholder="http://localhost:3000/api/flags"
              value={endpoint}
              onChange={(e) => setEndpoint(e.target.value)}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={isConnecting || !endpoint || !secret}>
            {isConnecting ? "Connecting..." : "Connect"}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}
