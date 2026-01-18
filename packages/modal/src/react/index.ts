// Context & Provider

export type { ModalManager } from "../manager";
// Re-export types from core
export type { Modal, ModalComponentOptions, ModalInstance } from "../types";
export { ActiveModalProvider, useActiveModal } from "./active-modal-context";
export { ModalProvider, useModalManager } from "./context";
// Hooks
export { useModal, useModals } from "./hooks";

// Legacy exports for backwards compatibility
export {
  ModalClientProvider,
  useModalClient,
} from "./modal-client-context";
// Outlet
export { ModalOutlet, useModalInstance } from "./outlet";
