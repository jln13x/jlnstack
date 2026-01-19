// Context & Provider

export type { ModalManager } from "../manager";
// Re-export types from core
export type {
  AnyModal,
  Modal,
  ModalComponentOptions,
  ModalInstance,
  ServerModal,
} from "../types";
export { isServerModal } from "../types";
export { ActiveModalProvider, useActiveModal } from "./active-modal-context";
export { ModalProvider, useModalManager } from "./context";
// Hooks
/**
 * @deprecated Use `useModal` instead - it now handles both client and server modals
 */
export { useModal, useModal as useServerModal, useModals } from "./hooks";

// Legacy exports for backwards compatibility
export {
  ModalClientProvider,
  useModalClient,
} from "./modal-client-context";
// Outlet
export { ModalOutlet, useModalInstance } from "./outlet";
