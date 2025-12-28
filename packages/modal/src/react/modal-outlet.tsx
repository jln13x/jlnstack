"use client";

import { useSyncExternalStore } from "react";
import { useModalClient } from "./modal-client-context";

export function ModalOutlet() {
  const client = useModalClient();

  const state = useSyncExternalStore(
    (cb) => client.subscribe(cb),
    () => client.getState(),
  );

  return state.modals.map(({ render }, index) => (
    <div
      // biome-ignore lint/suspicious/noArrayIndexKey: key
      key={`modal-${index}`}
    >
      {render()}
    </div>
  ));
}
