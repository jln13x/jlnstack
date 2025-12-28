import type { Modal } from "../modal-client";
import { useModalClient } from "./modal-client-context";

export function useModal<TModal extends Modal<any>>(modal: TModal) {
  const mc = useModalClient();

  return {
    open: (input: TModal["$types"]["input"]) => {
      mc.add(modal, input);
    },
    close: () => {
      mc.dismiss(modal);
    },
  };
}
