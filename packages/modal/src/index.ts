// Types
export type {
  Modal,
  ModalComponentOptions,
  ModalDef,
  ModalInstance,
  OpenModalResult,
  Position,
  Size,
  TemplateContext,
  TemplateWrapper,
  WithDefaults,
} from "./types";

// Builder
export {
  modal,
  type CreateOptions,
  type ModalBuilder,
  type StandardSchemaV1,
} from "./builder";

// Store
export {
  createModalStore,
  type AddModalOptions,
  type ModalStore,
  type ModalStoreActions,
  type ModalStoreOptions,
  type ModalInstanceState,
} from "./store";

// Open function
export { openModal } from "./open";

// Manager
export {
  createModalManager,
  type ModalManager,
  type ModalManagerOptions,
} from "./manager";

// Legacy exports for backwards compatibility
export { ModalClient, type ModalClientState } from "./modal-client";
