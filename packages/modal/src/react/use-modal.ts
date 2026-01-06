import type { Modal } from "../modal-client";
import { useModalClient } from "./modal-client-context";

export function useModal<TInput, TOutput>(modal: Modal<TInput, TOutput>) {
  const client = useModalClient();

  return {
    open: (input: TInput): Promise<TOutput | undefined> => {
      return client.open(modal, input);
    },
  };
}
