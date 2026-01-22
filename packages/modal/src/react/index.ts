// Context & Provider
export type { ModalManager } from "../manager";
// Re-export types from core
export type { Modal, ModalComponentOptions, ModalInstance } from "../types";
export { ModalProvider, useModalManager } from "./context";
// Hooks
export { useModal, useModals } from "./hooks";
// Outlet
export { ModalOutlet, useModalInstance } from "./outlet";
