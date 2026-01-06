"use client";

import { useCallback, useSyncExternalStore } from "react";
import type { ModalInstance } from "../modal-client";
import { InnerModalProvider } from "./inner-modal-context";
import { useModalClient } from "./modal-client-context";

const emptyState = { modals: [] };

export function ModalOutlet() {
  const client = useModalClient();

  const state = useSyncExternalStore(
    (cb) => client.subscribe(cb),
    () => client.getState(),
    () => emptyState,
  );

  return state.modals.map((modal) => (
    <ModalWrapper key={modal.id} modal={modal} />
  ));
}

function ModalWrapper({ modal }: { modal: ModalInstance }) {
  const close = useCallback(() => modal.close(), [modal]);
  const resolve = useCallback(
    (value: unknown) => modal.resolve(value),
    [modal],
  );

  return (
    <InnerModalProvider open={modal.open} close={close} resolve={resolve}>
      {modal.render() as React.ReactNode}
    </InnerModalProvider>
  );
}
