"use client";

import { useCallback, useSyncExternalStore } from "react";
import { InnerModalProvider } from "./inner-modal-context";
import { useModalClient } from "./modal-client-context";

export function ModalOutlet() {
  const client = useModalClient();

  const state = useSyncExternalStore(
    (cb) => client.subscribe(cb),
    () => client.getState(),
  );

  return state.modals.map((modal, index) => (
    // biome-ignore lint/suspicious/noArrayIndexKey: key
    <ModalWrapper key={`modal-${index}`} modal={modal} />
  ));
}

function ModalWrapper({
  modal,
}: {
  modal: {
    open: boolean;
    render: () => unknown;
    close: () => void;
  };
}) {
  const close = useCallback(() => modal.close(), [modal.close]);

  return (
    <InnerModalProvider open={modal.open} close={close}>
      {modal.render() as React.ReactNode}
    </InnerModalProvider>
  );
}
