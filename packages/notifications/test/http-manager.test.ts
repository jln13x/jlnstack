import { describe, expect, it, vi } from "vitest";
import { createHttpNotificationManager } from "../src/client";

describe("createHttpNotificationManager", () => {
  it("should use default baseUrl", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: [] })),
    });

    const manager = createHttpNotificationManager({
      fetch: mockFetch,
    });

    await manager.list();

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/notifications",
      expect.objectContaining({
        headers: { "Content-Type": "application/json" },
      }),
    );
  });

  it("should use custom baseUrl", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: [] })),
    });

    const manager = createHttpNotificationManager({
      baseUrl: "/custom/api",
      fetch: mockFetch,
    });

    await manager.list();

    expect(mockFetch).toHaveBeenCalledWith("/custom/api", expect.any(Object));
  });

  it("should build query string from filter", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () => Promise.resolve(JSON.stringify({ data: [] })),
    });

    const manager = createHttpNotificationManager({
      fetch: mockFetch,
    });

    await manager.list({ type: "message", read: false, limit: 10, offset: 5 });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/notifications?type=message&read=false&limit=10&offset=5",
      expect.any(Object),
    );
  });

  it("should throw on HTTP error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      text: () => Promise.resolve(JSON.stringify({ error: "Server error" })),
    });

    const manager = createHttpNotificationManager({
      fetch: mockFetch,
    });

    await expect(manager.list()).rejects.toThrow("Server error");
  });

  it("should return null for get on error", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      text: () => Promise.resolve(JSON.stringify({ error: "Not found" })),
    });

    const manager = createHttpNotificationManager({
      fetch: mockFetch,
    });

    const result = await manager.get("nonexistent");
    expect(result).toBeNull();
  });

  it("should send notification with correct payload", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            data: {
              id: "1",
              type: "message",
              title: "Test",
              data: { from: "john" },
            },
          }),
        ),
    });

    const manager = createHttpNotificationManager<{
      message: { from: string };
    }>({
      fetch: mockFetch,
    });

    await manager.send({
      type: "message",
      title: "Test",
      data: { from: "john" },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/notifications/send",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          type: "message",
          title: "Test",
          data: { from: "john" },
        }),
      }),
    );
  });

  it("should use transformer for deserialization", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve(
          JSON.stringify({
            json: {
              data: [{ id: "1", createdAt: "2024-01-01T00:00:00.000Z" }],
            },
          }),
        ),
    });

    const manager = createHttpNotificationManager({
      fetch: mockFetch,
      transformer: {
        serialize: (data) => data,
        deserialize: <T>(data: unknown): T => {
          const parsed = data as { json: { data: unknown[] } };
          return parsed.json as T;
        },
      },
    });

    const result = await manager.list();
    expect(result).toEqual([
      { id: "1", createdAt: "2024-01-01T00:00:00.000Z" },
    ]);
  });
});
