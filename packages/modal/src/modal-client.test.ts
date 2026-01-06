import { describe, expect, it, vi } from "vitest";
import {
  ModalClient,
  type Modal,
  type ModalComponentOptions,
} from "./modal-client";

function createTestModal<TInput, TOutput>(): Modal<TInput, TOutput> & {
  lastInput: TInput | undefined;
  lastOptions: ModalComponentOptions<TOutput> | undefined;
} {
  const modal: Modal<TInput, TOutput> & {
    lastInput: TInput | undefined;
    lastOptions: ModalComponentOptions<TOutput> | undefined;
  } = {
    lastInput: undefined,
    lastOptions: undefined,
    _def: {
      component: (input, options) => {
        modal.lastInput = input;
        modal.lastOptions = options;
        return null;
      },
    },
  };
  return modal;
}

function renderModal(client: ModalClient, index = 0) {
  const instance = client.getState().modals[index];
  instance.render();
}

describe("ModalClient", () => {
  describe("open", () => {
    it("should return a promise that resolves when modal resolves", async () => {
      const client = new ModalClient();
      const modal = createTestModal<{ title: string }, boolean>();

      const promise = client.open(modal, { title: "Test" });
      renderModal(client);

      modal.lastOptions!.resolve(true);

      const result = await promise;
      expect(result).toBe(true);
    });

    it("should return undefined when modal closes", async () => {
      const client = new ModalClient();
      const modal = createTestModal<{ title: string }, boolean>();

      const promise = client.open(modal, { title: "Test" });
      renderModal(client);

      modal.lastOptions!.close();

      const result = await promise;
      expect(result).toBeUndefined();
    });

    it("should pass input to the component", () => {
      const client = new ModalClient();
      const modal = createTestModal<{ title: string }, boolean>();

      client.open(modal, { title: "Hello" });
      renderModal(client);

      expect(modal.lastInput).toEqual({ title: "Hello" });
    });

    it("should remove modal from state after resolve", async () => {
      const client = new ModalClient();
      const modal = createTestModal<{ title: string }, boolean>();

      client.open(modal, { title: "Test" });
      renderModal(client);
      expect(client.getState().modals).toHaveLength(1);

      modal.lastOptions!.resolve(true);
      expect(client.getState().modals).toHaveLength(0);
    });

    it("should remove modal from state after close", async () => {
      const client = new ModalClient();
      const modal = createTestModal<{ title: string }, boolean>();

      client.open(modal, { title: "Test" });
      renderModal(client);
      expect(client.getState().modals).toHaveLength(1);

      modal.lastOptions!.close();
      expect(client.getState().modals).toHaveLength(0);
    });
  });

  describe("stable IDs", () => {
    it("should generate unique IDs for each modal", () => {
      const client = new ModalClient();
      const modal = createTestModal<void, void>();

      client.open(modal, undefined);
      client.open(modal, undefined);
      client.open(modal, undefined);

      const ids = client.getState().modals.map((m) => m.id);
      expect(ids).toEqual(["m-1", "m-2", "m-3"]);
    });

    it("should use IDs as unique identifiers", () => {
      const client = new ModalClient();
      const modal = createTestModal<void, void>();

      client.open(modal, undefined);
      client.open(modal, undefined);

      const [first, second] = client.getState().modals;
      expect(first.id).not.toBe(second.id);
    });
  });

  describe("stacking order", () => {
    it("should assign order based on open sequence", () => {
      const client = new ModalClient();
      const modal = createTestModal<void, void>();

      client.open(modal, undefined);
      client.open(modal, undefined);
      client.open(modal, undefined);

      const orders = client.getState().modals.map((m) => m.order);
      expect(orders).toEqual([1, 2, 3]);
    });

    it("should return modals sorted by order", () => {
      const client = new ModalClient();
      const modal = createTestModal<void, void>();

      client.open(modal, undefined);
      client.open(modal, undefined);
      client.open(modal, undefined);

      const state = client.getState();
      for (let i = 1; i < state.modals.length; i++) {
        expect(state.modals[i].order).toBeGreaterThan(
          state.modals[i - 1].order,
        );
      }
    });
  });

  describe("subscribe", () => {
    it("should notify listeners when modal is opened", () => {
      const client = new ModalClient();
      const modal = createTestModal<void, void>();
      const listener = vi.fn();

      client.subscribe(listener);
      client.open(modal, undefined);

      expect(listener).toHaveBeenCalledTimes(1);
    });

    it("should notify listeners when modal is resolved", () => {
      const client = new ModalClient();
      const modal = createTestModal<void, boolean>();
      const listener = vi.fn();

      client.subscribe(listener);
      client.open(modal, undefined);
      renderModal(client);
      modal.lastOptions!.resolve(true);

      expect(listener).toHaveBeenCalledTimes(2);
    });

    it("should allow unsubscribing", () => {
      const client = new ModalClient();
      const modal = createTestModal<void, void>();
      const listener = vi.fn();

      const unsubscribe = client.subscribe(listener);
      unsubscribe();
      client.open(modal, undefined);

      expect(listener).not.toHaveBeenCalled();
    });
  });
});
