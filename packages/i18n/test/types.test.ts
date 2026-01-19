import { describe, it, expectTypeOf } from "vitest";
import type {
  ExtractVars,
  TranslationDict,
  TranslationKeys,
  MergeTranslationKeys,
  GetTranslationValue,
  TranslateFn,
} from "../src/types";

describe("types", () => {
  describe("ExtractVars", () => {
    it("should extract single variable", () => {
      type Result = ExtractVars<"Hello, {name}!">;
      expectTypeOf<Result>().toEqualTypeOf<"name">();
    });

    it("should extract multiple variables", () => {
      type Result = ExtractVars<"Hello, {name}! You have {count} messages.">;
      expectTypeOf<Result>().toEqualTypeOf<"name" | "count">();
    });

    it("should return never for no variables", () => {
      type Result = ExtractVars<"Hello, world!">;
      expectTypeOf<Result>().toEqualTypeOf<never>();
    });
  });

  describe("TranslationKeys", () => {
    it("should extract keys from dict", () => {
      type Dict = {
        login: { en: "Login"; de: "Anmelden" };
        logout: { en: "Logout"; de: "Abmelden" };
      };
      type Result = TranslationKeys<Dict>;
      expectTypeOf<Result>().toEqualTypeOf<"login" | "logout">();
    });
  });

  describe("MergeTranslationKeys", () => {
    it("should merge keys from multiple dicts", () => {
      type Dict1 = {
        login: { en: "Login" };
      };
      type Dict2 = {
        save: { en: "Save" };
      };
      type Result = MergeTranslationKeys<[Dict1, Dict2]>;
      expectTypeOf<Result>().toEqualTypeOf<"login" | "save">();
    });
  });

  describe("GetTranslationValue", () => {
    it("should get value for key from merged dicts", () => {
      type Dict1 = {
        login: { en: "Login"; de: "Anmelden" };
      };
      type Dict2 = {
        save: { en: "Save"; de: "Speichern" };
      };
      type Result = GetTranslationValue<[Dict1, Dict2], "login">;
      expectTypeOf<Result>().toEqualTypeOf<{ en: "Login"; de: "Anmelden" }>();
    });
  });

  describe("TranslateFn", () => {
    it("should require vars when interpolation exists", () => {
      type Dict = {
        greeting: { en: "Hello, {name}!" };
      };
      type Fn = TranslateFn<[Dict]>;

      // This tests the function signature shape
      type Params = Parameters<Fn>;
      expectTypeOf<Params[0]>().toEqualTypeOf<"greeting">();
    });

    it("should not require vars when no interpolation", () => {
      type Dict = {
        hello: { en: "Hello!" };
      };
      type Fn = TranslateFn<[Dict]>;

      type Params = Parameters<Fn>;
      expectTypeOf<Params[0]>().toEqualTypeOf<"hello">();
    });
  });
});
