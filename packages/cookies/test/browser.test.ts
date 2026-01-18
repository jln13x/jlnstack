import type { StandardSchemaV1 } from "@standard-schema/spec";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCookie } from "../src/browser";

function createMockSchema<T>(
  transform: (value: unknown) => T,
): StandardSchemaV1<T> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: (value) => ({ value: transform(value) as T }),
    },
  };
}

function createFailingSchema(message: string): StandardSchemaV1<never> {
  return {
    "~standard": {
      version: 1,
      vendor: "test",
      validate: () => ({ issues: [{ message }] }),
    },
  };
}

const mockDocument = {
  cookie: "",
};

vi.stubGlobal("document", mockDocument);

describe("browser createCookie", () => {
  afterEach(() => {
    mockDocument.cookie = "";
  });

  it("gets and sets string values", async () => {
    const cookie = createCookie<string>({ name: "theme" });

    expect(await cookie.get()).toBe(undefined);

    await cookie.set("dark");
    expect(mockDocument.cookie).toContain("theme=dark");
    expect(await cookie.get()).toBe("dark");
  });

  it("gets and sets object values", async () => {
    const cookie = createCookie<{ sort: string }>({ name: "filter" });

    await cookie.set({ sort: "name" });
    expect(await cookie.get()).toEqual({ sort: "name" });
  });

  it("deletes cookies", async () => {
    const cookie = createCookie<string>({ name: "session" });

    await cookie.set("abc123");
    expect(await cookie.get()).toBe("abc123");

    await cookie.delete();
    expect(mockDocument.cookie).toContain("max-age=0");
  });

  it("handles multiple cookies", async () => {
    mockDocument.cookie = "foo=bar; theme=light; session=xyz";
    const cookie = createCookie<string>({ name: "theme" });

    expect(await cookie.get()).toBe("light");
  });

  it("decodes URI-encoded values", async () => {
    mockDocument.cookie = `name=${encodeURIComponent("hello world")}`;
    const cookie = createCookie<string>({ name: "name" });

    expect(await cookie.get()).toBe("hello world");
  });

  it("handles values with equals signs", async () => {
    mockDocument.cookie = "token=abc=def=ghi";
    const cookie = createCookie<string>({ name: "token" });

    expect(await cookie.get()).toBe("abc=def=ghi");
  });

  it("sets cookie with maxAge option", async () => {
    const cookie = createCookie<string>({ name: "session" });

    await cookie.set("value", { maxAge: 3600 });
    expect(mockDocument.cookie).toContain("max-age=3600");
  });

  it("sets cookie with expires option", async () => {
    const cookie = createCookie<string>({ name: "session" });
    const expires = new Date("2025-12-31T00:00:00Z");

    await cookie.set("value", { expires });
    expect(mockDocument.cookie).toContain("expires=");
  });

  it("sets cookie with path option", async () => {
    const cookie = createCookie<string>({ name: "session" });

    await cookie.set("value", { path: "/app" });
    expect(mockDocument.cookie).toContain("path=/app");
  });

  it("sets cookie with domain option", async () => {
    const cookie = createCookie<string>({ name: "session" });

    await cookie.set("value", { domain: ".example.com" });
    expect(mockDocument.cookie).toContain("domain=.example.com");
  });

  it("sets cookie with secure option", async () => {
    const cookie = createCookie<string>({ name: "session" });

    await cookie.set("value", { secure: true });
    expect(mockDocument.cookie).toContain("secure");
  });

  it("sets cookie with sameSite option", async () => {
    const cookie = createCookie<string>({ name: "session" });

    await cookie.set("value", { sameSite: "strict" });
    expect(mockDocument.cookie).toContain("samesite=strict");
  });

  it("validates values with schema on get", async () => {
    const schema = createMockSchema((v) => v as { sort: string });
    const cookie = createCookie({ name: "filter", schema });

    mockDocument.cookie = `filter=${encodeURIComponent(JSON.stringify({ sort: "name" }))}`;
    expect(await cookie.get()).toEqual({ sort: "name" });
  });

  it("returns undefined when schema validation fails on get", async () => {
    const schema = createFailingSchema("Invalid value");
    const cookie = createCookie({ name: "test", schema });

    mockDocument.cookie = `test=${encodeURIComponent(JSON.stringify({ invalid: true }))}`;
    expect(await cookie.get()).toBe(undefined);
  });

  it("throws when schema validation fails on set", async () => {
    const schema = createFailingSchema("Invalid value");
    const cookie = createCookie({ name: "test", schema });

    await expect(cookie.set("bad" as never)).rejects.toThrow(
      "Invalid cookie value",
    );
  });

  it("exposes name property", () => {
    const cookie = createCookie<string>({ name: "myName" });
    expect(cookie.name).toBe("myName");
  });
});
