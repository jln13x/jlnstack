"use client";

import { useFlags } from "@/lib/flags";

export default function FlagsPage() {
  const flags = useFlags();

  return (
    <div>
      <h1>Flags</h1>

      <pre>{JSON.stringify(flags, null, 2)}</pre>
    </div>
  );
}
