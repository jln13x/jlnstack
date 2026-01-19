import { describe, it, expect } from "vitest";
import { interpolate } from "../src/interpolate";

describe("interpolate", () => {
  it("should replace single variable", () => {
    const result = interpolate("Hello, {name}!", { name: "World" });
    expect(result).toBe("Hello, World!");
  });

  it("should replace multiple variables", () => {
    const result = interpolate("Hello, {name}! You have {count} messages.", {
      name: "John",
      count: 5,
    });
    expect(result).toBe("Hello, John! You have 5 messages.");
  });

  it("should handle numbers", () => {
    const result = interpolate("Count: {count}", { count: 42 });
    expect(result).toBe("Count: 42");
  });

  it("should return template unchanged if no vars provided", () => {
    const result = interpolate("Hello, {name}!");
    expect(result).toBe("Hello, {name}!");
  });

  it("should leave unknown variables unchanged", () => {
    const result = interpolate("Hello, {name}! Your id is {id}.", {
      name: "John",
    });
    expect(result).toBe("Hello, John! Your id is {id}.");
  });

  it("should handle empty vars object", () => {
    const result = interpolate("Hello, {name}!", {});
    expect(result).toBe("Hello, {name}!");
  });

  it("should handle string without variables", () => {
    const result = interpolate("Hello, World!", { name: "John" });
    expect(result).toBe("Hello, World!");
  });

  it("should handle repeated variables", () => {
    const result = interpolate("{name} said hello to {name}", { name: "John" });
    expect(result).toBe("John said hello to John");
  });

  it("should handle zero as a value", () => {
    const result = interpolate("You have {count} items", { count: 0 });
    expect(result).toBe("You have 0 items");
  });

  it("should handle empty string as a value", () => {
    const result = interpolate("Hello, {name}!", { name: "" });
    expect(result).toBe("Hello, !");
  });
});
