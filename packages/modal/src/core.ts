import type { Modal } from "./modal-client";

export function createModal<TInput>(
  render: <T>(input: TInput) => T,
): Modal<TInput> {
  return {
    _render: render,
  } as Modal<TInput>;
}
