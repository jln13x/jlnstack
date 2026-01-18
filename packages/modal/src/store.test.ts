import { beforeEach, describe, expect, it } from "vitest";
import { createModalStore } from "./store";

describe("createModalStore", () => {
  let store: ReturnType<typeof createModalStore>;

  beforeEach(() => {
    store = createModalStore();
  });

  describe("CRUD operations", () => {
    it("should add a modal", () => {
      store.actions.add("m-1");

      const modal = store.actions.get("m-1");
      expect(modal).toBeDefined();
      expect(modal?.id).toBe("m-1");
      expect(modal?.open).toBe(true);
    });

    it("should throw when adding duplicate id", () => {
      store.actions.add("m-1");
      expect(() => store.actions.add("m-1")).toThrow(
        'Modal with id "m-1" already exists',
      );
    });

    it("should remove a modal", () => {
      store.actions.add("m-1");
      store.actions.remove("m-1");

      expect(store.actions.get("m-1")).toBeUndefined();
    });

    it("should throw when removing non-existent modal", () => {
      expect(() => store.actions.remove("non-existent")).toThrow(
        'Modal with id "non-existent" not found',
      );
    });

    it("should return undefined for non-existent modal with get", () => {
      expect(store.actions.get("non-existent")).toBeUndefined();
    });

    it("should check if modal exists with has", () => {
      expect(store.actions.has("m-1")).toBe(false);

      store.actions.add("m-1");
      expect(store.actions.has("m-1")).toBe(true);

      store.actions.remove("m-1");
      expect(store.actions.has("m-1")).toBe(false);
    });
  });

  describe("queries", () => {
    it("should get all modals sorted by order", () => {
      store.actions.add("m-1");
      store.actions.add("m-2");
      store.actions.add("m-3");

      const all = store.actions.getAll();
      expect(all).toHaveLength(3);
      expect(all.at(0)?.id).toBe("m-1");
      expect(all.at(1)?.id).toBe("m-2");
      expect(all.at(2)?.id).toBe("m-3");
    });

    it("should get the top modal", () => {
      store.actions.add("m-1");
      store.actions.add("m-2");

      expect(store.actions.getTopModal()?.id).toBe("m-2");
    });

    it("should return undefined for top modal when empty", () => {
      expect(store.actions.getTopModal()).toBeUndefined();
    });

    it("should get the bottom modal", () => {
      store.actions.add("m-1");
      store.actions.add("m-2");

      expect(store.actions.getBottomModal()?.id).toBe("m-1");
    });

    it("should return undefined for bottom modal when empty", () => {
      expect(store.actions.getBottomModal()).toBeUndefined();
    });

    it("should get the index of a modal", () => {
      store.actions.add("m-1");
      store.actions.add("m-2");
      store.actions.add("m-3");

      expect(store.actions.getIndex("m-1")).toBe(0);
      expect(store.actions.getIndex("m-2")).toBe(1);
      expect(store.actions.getIndex("m-3")).toBe(2);
    });

    it("should throw when getting index of non-existent modal", () => {
      expect(() => store.actions.getIndex("non-existent")).toThrow(
        'Modal with id "non-existent" not found',
      );
    });

    it("should check if a modal is on top", () => {
      store.actions.add("m-1");
      store.actions.add("m-2");

      expect(store.actions.isOnTop("m-1")).toBe(false);
      expect(store.actions.isOnTop("m-2")).toBe(true);
    });

    it("should throw when checking isOnTop for non-existent modal", () => {
      expect(() => store.actions.isOnTop("non-existent")).toThrow(
        'Modal with id "non-existent" not found',
      );
    });

    it("should count modals", () => {
      expect(store.actions.count()).toBe(0);

      store.actions.add("m-1");
      expect(store.actions.count()).toBe(1);

      store.actions.add("m-2");
      expect(store.actions.count()).toBe(2);
    });
  });

  describe("stack operations", () => {
    beforeEach(() => {
      store.actions.add("m-1");
      store.actions.add("m-2");
      store.actions.add("m-3");
    });

    it("should bring a modal to front", () => {
      store.actions.bringToFront("m-1");

      const all = store.actions.getAll();
      expect(all.at(-1)?.id).toBe("m-1");
      expect(store.actions.isOnTop("m-1")).toBe(true);
    });

    it("should throw when bringing non-existent modal to front", () => {
      expect(() => store.actions.bringToFront("non-existent")).toThrow(
        'Modal with id "non-existent" not found',
      );
    });

    it("should not change order if already on top", () => {
      const beforeOrder = store.actions.get("m-3")?.order;
      store.actions.bringToFront("m-3");
      const afterOrder = store.actions.get("m-3")?.order;

      expect(beforeOrder).toBe(afterOrder);
    });

    it("should send a modal to back", () => {
      store.actions.sendToBack("m-3");

      const all = store.actions.getAll();
      expect(all.at(0)?.id).toBe("m-3");
    });

    it("should throw when sending non-existent modal to back", () => {
      expect(() => store.actions.sendToBack("non-existent")).toThrow(
        'Modal with id "non-existent" not found',
      );
    });

    it("should move a modal up", () => {
      store.actions.moveUp("m-1");

      const all = store.actions.getAll();
      expect(all.at(0)?.id).toBe("m-2");
      expect(all.at(1)?.id).toBe("m-1");
      expect(all.at(2)?.id).toBe("m-3");
    });

    it("should throw when moving non-existent modal up", () => {
      expect(() => store.actions.moveUp("non-existent")).toThrow(
        'Modal with id "non-existent" not found',
      );
    });

    it("should not move up if already on top", () => {
      const beforeAll = store.actions.getAll().map((m) => m.id);
      store.actions.moveUp("m-3");
      const afterAll = store.actions.getAll().map((m) => m.id);

      expect(beforeAll).toEqual(afterAll);
    });

    it("should move a modal down", () => {
      store.actions.moveDown("m-3");

      const all = store.actions.getAll();
      expect(all.at(0)?.id).toBe("m-1");
      expect(all.at(1)?.id).toBe("m-3");
      expect(all.at(2)?.id).toBe("m-2");
    });

    it("should throw when moving non-existent modal down", () => {
      expect(() => store.actions.moveDown("non-existent")).toThrow(
        'Modal with id "non-existent" not found',
      );
    });

    it("should not move down if already at bottom", () => {
      const beforeAll = store.actions.getAll().map((m) => m.id);
      store.actions.moveDown("m-1");
      const afterAll = store.actions.getAll().map((m) => m.id);

      expect(beforeAll).toEqual(afterAll);
    });
  });

  describe("batch operations", () => {
    it("should close all modals", () => {
      store.actions.add("m-1");
      store.actions.add("m-2");
      store.actions.add("m-3");

      store.actions.closeAll();

      expect(store.actions.count()).toBe(0);
      expect(store.actions.getAll()).toEqual([]);
    });
  });

  describe("order normalization", () => {
    it("should normalize orders after removal", () => {
      store.actions.add("m-1");
      store.actions.add("m-2");
      store.actions.add("m-3");

      store.actions.remove("m-2");

      const all = store.actions.getAll();
      expect(all).toHaveLength(2);
      expect(all.at(0)?.order).toBe(1);
      expect(all.at(1)?.order).toBe(2);
    });
  });

  describe("generateId", () => {
    it("should generate unique IDs", () => {
      const id1 = store.generateId();
      const id2 = store.generateId();
      const id3 = store.generateId();

      expect(id1).toBe("m-1");
      expect(id2).toBe("m-2");
      expect(id3).toBe("m-3");
    });

    it("should use custom prefix", () => {
      const customStore = createModalStore({ idPrefix: "modal" });

      expect(customStore.generateId()).toBe("modal-1");
    });
  });

  describe("subscription", () => {
    it("should notify subscribers on state change", () => {
      let notified = false;
      store.store.subscribe(() => {
        notified = true;
      });

      store.actions.add("m-1");

      expect(notified).toBe(true);
    });
  });
});
