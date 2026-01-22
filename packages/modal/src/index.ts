// Types

// Builder
export {
  type CreateOptions,
  type ModalBuilder,
  modal,
  type StandardSchemaV1,
} from "./builder";
// Lazy loading
export { type LazyModalOptions, lazy } from "./lazy";
// Manager
export {
  createModalManager,
  type ModalManager,
  type ModalManagerOptions,
} from "./manager";
// Legacy exports for backwards compatibility
export { ModalClient, type ModalClientState } from "./modal-client";

// Open function
export { openModal } from "./open";
// Store
export {
  type AddModalOptions,
  createModalStore,
  type ModalInstanceState,
  type ModalStore,
  type ModalStoreActions,
  type ModalStoreOptions,
} from "./store";
export {
  type AnyModal,
  isServerModal,
  type Modal,
  type ModalComponentOptions,
  type ModalDef,
  type ModalInstance,
  type OpenModalResult,
  type Position,
  type ServerModal,
  type Size,
  type TemplateContext,
  type TemplateWrapper,
  type WithDefaults,
} from "./types";
