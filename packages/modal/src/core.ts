// Re-export for backwards compatibility
export { modal, type StandardSchemaV1 } from "./builder";
export type { Modal, ModalComponentOptions, ModalDef } from "./types";

// Registry types (kept here as they're not core to the new architecture)
type ModalRegistry<TModals extends Record<string, unknown>> = {
  [K in keyof TModals]: TModals[K] extends import("./types").Modal<
    infer TInput,
    infer TOutput
  >
    ? import("./types").Modal<TInput, TOutput>
    : TModals[K] extends Record<string, unknown>
      ? ModalRegistry<TModals[K]>
      : never;
};

function createModalRegistry<
  TModals extends Record<
    string,
    import("./types").Modal<unknown, unknown> | Record<string, unknown>
  >,
>(modals: TModals): ModalRegistry<TModals> {
  return modals as unknown as ModalRegistry<TModals>;
}

export { createModalRegistry, type ModalRegistry };
