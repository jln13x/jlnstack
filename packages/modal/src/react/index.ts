// Context & Provider
export { ModalProvider, useModalManager } from "./context";

// Outlet
export { ModalOutlet, useModalInstance } from "./outlet";

// Hooks
export { useModal, useModals } from "./hooks";

// Re-export types from core
export type { Modal, ModalInstance, ModalComponentOptions } from "../types";
export type { ModalManager } from "../manager";

// Legacy exports for backwards compatibility
export {
  ModalClientProvider,
  useModalClient,
} from "./modal-client-context";
export { useActiveModal, ActiveModalProvider } from "./active-modal-context";
