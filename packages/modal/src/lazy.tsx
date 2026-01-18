import { type ReactNode, lazy as reactLazy, Suspense } from "react";
import type { Modal, ModalComponentOptions, ModalDef } from "./types";

export type LazyModalOptions = {
  fallback?: ReactNode;
};

/**
 * Wraps a modal import for lazy loading. The modal is only loaded when first opened.
 *
 * @example
 * ```tsx
 * // settings.ts - normal modal definition
 * export const settingsModal = modal
 *   .input<{ userId: string }>()
 *   .create((input, { close }) => <div>...</div>);
 *
 * // modals/index.ts
 * import { lazy } from "@jlnstack/modal";
 *
 * export const modals = {
 *   settings: lazy(() => import("./settings").then(m => m.settingsModal)),
 * };
 * ```
 */
export function lazy<TInput, TOutput, TDefaults extends Partial<TInput> = {}>(
  importFn: () => Promise<Modal<TInput, TOutput, TDefaults>>,
  options?: LazyModalOptions,
): Modal<TInput, TOutput, TDefaults> {
  let loadedDefaults: TDefaults = {} as TDefaults;

  const LazyWrapper = reactLazy(async () => {
    const loadedModal = await importFn();
    loadedDefaults = loadedModal._inputDefaults;
    return {
      default: function LazyModalRenderer(props: {
        input: TInput;
        options: ModalComponentOptions<TOutput>;
      }) {
        return loadedModal._def.component(
          props.input,
          props.options,
        ) as ReactNode;
      },
    };
  });

  const def: ModalDef<TInput, TOutput> = {
    component: (input, opts) => (
      <Suspense fallback={options?.fallback ?? null}>
        <LazyWrapper input={input} options={opts} />
      </Suspense>
    ),
  };

  return {
    _def: def,
    get _inputDefaults() {
      return loadedDefaults;
    },
  } as Modal<TInput, TOutput, TDefaults>;
}
