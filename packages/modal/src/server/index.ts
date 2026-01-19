/**
 * @deprecated Import from "@jlnstack/modal" instead.
 * Use `modal.server()` instead of `serverModal.create()`
 */

import { modal } from "../builder";
import { isServerModal, type ServerModal } from "../types";

/**
 * @deprecated Use `modal.server()` instead
 */
export const serverModal = modal;

/**
 * @deprecated Use `isServerModal` from "@jlnstack/modal" instead
 */
export const isServerModalDef = isServerModal;

/**
 * @deprecated Use `ServerModal` from "@jlnstack/modal" instead
 */
export type ServerModalDef<TInput, TOutput = void> = ServerModal<TInput, TOutput>;

/**
 * @deprecated Use the type inference from the modal definition directly
 */
export type InferServerModalInput<T> = T extends ServerModal<infer I, any>
  ? I
  : never;

/**
 * @deprecated Use the type inference from the modal definition directly
 */
export type InferServerModalOutput<T> = T extends ServerModal<any, infer O>
  ? O
  : never;
