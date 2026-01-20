import { describe, expect, it } from "vitest";
import { generateMermaid, getMermaidLiveUrl } from "../src/devtools";
import { createFilterStore } from "../src/filter-client";
import { booleanFilter, stringFilter } from "../src/index";

const schema = {
  name: stringFilter({ operators: ["eq", "contains"] }),
  active: booleanFilter(),
};

describe("devtools", () => {
  describe("generateMermaid", () => {
    it("should generate mermaid diagram for empty root", () => {
      const store = createFilterStore({ definitions: schema });
      const result = generateMermaid(store.getFilter());

      expect(result).toMatchInlineSnapshot(`
        "flowchart TD
          f_0[["AND (root)"]]"
      `);
    });

    it("should generate mermaid diagram with conditions", () => {
      const store = createFilterStore({
        definitions: schema,
        defaultFilter: {
          type: "group",
          operator: "and",
          filters: [
            {
              type: "condition",
              field: "name",
              value: { operator: "eq", value: "John" },
            },
            { type: "condition", field: "active", value: true },
          ],
        },
      });
      const result = generateMermaid(store.getFilter());

      expect(result).toMatchInlineSnapshot(`
        "flowchart TD
          f_0[["AND (root)"]]
          f_1("name: {'operator':'eq','value':'John'}")
          f_0 --> f_1
          f_2("active: true")
          f_0 --> f_2"
      `);
    });

    it("should generate mermaid diagram with nested groups", () => {
      const store = createFilterStore({
        definitions: schema,
        defaultFilter: {
          type: "group",
          operator: "and",
          filters: [
            {
              type: "group",
              operator: "or",
              filters: [{ type: "condition", field: "active", value: false }],
            },
          ],
        },
      });
      const result = generateMermaid(store.getFilter());

      expect(result).toMatchInlineSnapshot(`
        "flowchart TD
          f_0[["AND (root)"]]
          f_1[["OR"]]
          f_0 --> f_1
          f_2("active: false")
          f_1 --> f_2"
      `);
    });
  });

  describe("getMermaidLiveUrl", () => {
    it("should return a valid mermaid.live URL", () => {
      const store = createFilterStore({ definitions: schema });
      const url = getMermaidLiveUrl(store.getFilter());

      expect(url).toMatch(/^https:\/\/mermaid\.live\/edit#base64:/);
    });
  });
});
