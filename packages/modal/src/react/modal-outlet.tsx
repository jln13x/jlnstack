"use client";

import { Fragment, useSyncExternalStore } from "react";
import { useModalClient } from "./modal-client-context";

export function ModalOutlet() {
  const client = useModalClient();

  const state = useSyncExternalStore(
    (cb) => client.subscribe(cb),
    () => client.getState(),
  );

  return state.modals.map(({ render }, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: key
    <Fragment key={`modal-${index}`}>{render()}</Fragment>
  ));
}
