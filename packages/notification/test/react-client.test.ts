import { describe, expect, it, vi } from "vitest";
import { createNotificationClient, type QueryState } from "../src/react";
import type { HttpNotificationManager } from "../src/client";

type TestTypes = {
  message: { from: string };
  alert: { severity: string };
};

function createMockManager(
  overrides: Partial<HttpNotificationManager<TestTypes>> = {}
): HttpNotificationManager<TestTypes> {
  return {
    send: vi.fn(),
    get: vi.fn(),
    list: vi.fn().mockResolvedValue([]),
    count: vi.fn().mockResolvedValue(0),
    unreadCount: vi.fn().mockResolvedValue(0),
    markAsRead: vi.fn(),
    markManyAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    archive: vi.fn(),
    unarchive: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    ...overrides,
  };
}

describe("NotificationClient", () => {
  it("should create client from manager", () => {
    const manager = createMockManager();
    const client = createNotificationClient(manager);

    expect(client).toBeDefined();
    expect(client.getManager()).toBe(manager);
  });

  it("should return initial state for new query", () => {
    const manager = createMockManager();
    const client = createNotificationClient(manager);

    const state = client.getSnapshot(undefined);

    expect(state).toEqual({
      data: [],
      error: undefined,
      status: "idle",
      dataUpdatedAt: undefined,
    });
  });

  it("should serialize filter to stable key", () => {
    const manager = createMockManager();
    const client = createNotificationClient(manager);

    // Different order should produce same query
    const state1 = client.getSnapshot({ type: "message", read: false });
    const state2 = client.getSnapshot({ read: false, type: "message" });

    expect(state1).toBe(state2);
  });

  it("should auto-fetch on first subscription", async () => {
    const mockList = vi.fn().mockResolvedValue([
      { id: "1", type: "message", data: { from: "john" } },
    ]);
    const manager = createMockManager({ list: mockList });
    const client = createNotificationClient(manager);

    const listener = vi.fn();
    client.subscribe(undefined, listener);

    // Wait for fetch to complete
    await vi.waitFor(() => {
      expect(mockList).toHaveBeenCalled();
    });
  });

  it("should update state after fetch", async () => {
    const notifications = [
      { id: "1", type: "message" as const, data: { from: "john" } },
    ];
    const mockList = vi.fn().mockResolvedValue(notifications);
    const manager = createMockManager({ list: mockList });
    const client = createNotificationClient(manager);

    const listener = vi.fn();
    client.subscribe(undefined, listener);

    await vi.waitFor(() => {
      const state = client.getSnapshot(undefined);
      expect(state.status).toBe("success");
    });

    const state = client.getSnapshot(undefined);
    expect(state.data).toEqual(notifications);
    expect(state.dataUpdatedAt).toBeDefined();
  });

  it("should set error state on fetch failure", async () => {
    const mockList = vi.fn().mockRejectedValue(new Error("Network error"));
    const manager = createMockManager({ list: mockList });
    const client = createNotificationClient(manager);

    const listener = vi.fn();
    client.subscribe(undefined, listener);

    await vi.waitFor(() => {
      const state = client.getSnapshot(undefined);
      expect(state.status).toBe("error");
    });

    const state = client.getSnapshot(undefined);
    expect(state.error?.message).toBe("Network error");
  });

  it("should notify listeners on state change", async () => {
    const mockList = vi.fn().mockResolvedValue([]);
    const manager = createMockManager({ list: mockList });
    const client = createNotificationClient(manager);

    const listener = vi.fn();
    client.subscribe(undefined, listener);

    await vi.waitFor(() => {
      // Called at least twice: pending -> success
      expect(listener.mock.calls.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("should unsubscribe correctly", () => {
    const manager = createMockManager();
    const client = createNotificationClient(manager);

    const listener = vi.fn();
    const unsubscribe = client.subscribe(undefined, listener);

    unsubscribe();

    // Clear should work without issues after unsubscribe
    client.clear();
  });

  it("should dedupe concurrent fetches", async () => {
    let resolvePromise: (value: unknown[]) => void;
    const mockList = vi.fn().mockImplementation(
      () =>
        new Promise((resolve) => {
          resolvePromise = resolve;
        })
    );
    const manager = createMockManager({ list: mockList });
    const client = createNotificationClient(manager);

    // Start two fetches
    const fetch1 = client.fetch(undefined);
    const fetch2 = client.fetch(undefined);

    // Should only call list once
    expect(mockList).toHaveBeenCalledTimes(1);

    // Resolve
    resolvePromise!([]);
    await Promise.all([fetch1, fetch2]);
  });

  it("should invalidate queries with active listeners", async () => {
    const mockList = vi.fn().mockResolvedValue([]);
    const manager = createMockManager({ list: mockList });
    const client = createNotificationClient(manager);

    const listener = vi.fn();
    client.subscribe(undefined, listener);

    await vi.waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(1);
    });

    client.invalidateQueries();

    await vi.waitFor(() => {
      expect(mockList).toHaveBeenCalledTimes(2);
    });
  });

  it("should clear all queries", () => {
    const manager = createMockManager();
    const client = createNotificationClient(manager);

    // Create some queries
    client.getSnapshot({ type: "message" });
    client.getSnapshot({ type: "alert" });

    client.clear();

    // New snapshot should be fresh
    const state = client.getSnapshot({ type: "message" });
    expect(state.status).toBe("idle");
  });
});
