import type { ModalOptions } from "../modal-client";
import { useModalClient } from "./modal-client-context";

export function useModal<TInput, TOutput>(
  options: ModalOptions<TInput, TOutput>,
) {
  const mc = useModalClient();

  return {
    open: (input: TInput): void => {
      mc.open({ ...options, input });
    },
    close: () => {
      mc.dismiss(options);
    },
    resolve: (value: TOutput): void => {
      mc.resolve(options, value);
    },
    openAsync: (input: TInput): Promise<TOutput> => {
      return mc.openAsync(options, () => input);
    },
  };
}
