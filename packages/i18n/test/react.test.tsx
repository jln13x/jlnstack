import { describe, it, expect, expectTypeOf } from "vitest";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import {
  I18nProvider,
  useTranslation,
  useLocale,
  useSetLocale,
} from "../src/react";
import { defineTranslations } from "../src/define";

const auth = defineTranslations({
  login: { en: "Sign in", de: "Anmelden" },
  logout: { en: "Sign out", de: "Abmelden" },
});

const common = defineTranslations({
  save: { en: "Save", de: "Speichern" },
  cancel: { en: "Cancel", de: "Abbrechen" },
});

const greetings = defineTranslations({
  welcome: { en: "Hello, {name}!", de: "Hallo, {name}!" },
});

function createWrapper(locale: string, fallbackLocale?: string) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <I18nProvider locale={locale} fallbackLocale={fallbackLocale}>
        {children}
      </I18nProvider>
    );
  };
}

describe("I18nProvider", () => {
  it("should provide locale to children", () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: createWrapper("en"),
    });

    expect(result.current).toBe("en");
  });
});

describe("useLocale", () => {
  it("should return current locale", () => {
    const { result } = renderHook(() => useLocale(), {
      wrapper: createWrapper("de"),
    });

    expect(result.current).toBe("de");
  });

  it("should throw without provider", () => {
    expect(() => renderHook(() => useLocale())).toThrow(
      "useLocale must be used within an I18nProvider",
    );
  });
});

describe("useSetLocale", () => {
  it("should return setter function", () => {
    const { result } = renderHook(() => useSetLocale(), {
      wrapper: createWrapper("en"),
    });

    expect(typeof result.current).toBe("function");
  });
});

describe("useTranslation", () => {
  it("should translate a key", () => {
    const { result } = renderHook(() => useTranslation(auth), {
      wrapper: createWrapper("en"),
    });

    expect(result.current("login")).toBe("Sign in");
  });

  it("should translate with different locale", () => {
    const { result } = renderHook(() => useTranslation(auth), {
      wrapper: createWrapper("de"),
    });

    expect(result.current("login")).toBe("Anmelden");
  });

  it("should merge multiple dictionaries", () => {
    const { result } = renderHook(() => useTranslation(auth, common), {
      wrapper: createWrapper("en"),
    });

    expect(result.current("login")).toBe("Sign in");
    expect(result.current("save")).toBe("Save");
  });

  it("should interpolate variables", () => {
    const { result } = renderHook(() => useTranslation(greetings), {
      wrapper: createWrapper("en"),
    });

    expect(result.current("welcome", { name: "John" })).toBe("Hello, John!");
  });

  it("should throw without provider", () => {
    expect(() => renderHook(() => useTranslation(auth))).toThrow(
      "useTranslation must be used within an I18nProvider",
    );
  });

  it("should have correct types for keys", () => {
    const { result } = renderHook(() => useTranslation(auth, common), {
      wrapper: createWrapper("en"),
    });

    type KeyType = Parameters<typeof result.current>[0];
    expectTypeOf<"login">().toMatchTypeOf<KeyType>();
    expectTypeOf<"save">().toMatchTypeOf<KeyType>();
  });
});
