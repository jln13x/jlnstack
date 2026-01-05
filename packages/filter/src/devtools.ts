import type { FilterSchemaConstraint } from "./index";
import type { FilterExpression, Group } from "./types";
import { isGroup } from "./types";

function escapeLabel(str: string): string {
  return str.replace(/"/g, "'").replace(/[[\]]/g, "");
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "null";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function generateMermaid<Schema extends FilterSchemaConstraint>(
  filter: Group<Schema>,
): string {
  const lines: string[] = ["flowchart TD"];

  const traverse = (node: FilterExpression<Schema>, parentId?: string) => {
    const nodeId = node.id.replace(/-/g, "_");

    if (isGroup(node)) {
      const label = node.root
        ? `${node.operator.toUpperCase()} (root)`
        : node.operator.toUpperCase();
      lines.push(`  ${nodeId}[["${label}"]]`);

      if (parentId) {
        lines.push(`  ${parentId} --> ${nodeId}`);
      }

      for (const child of node.filters) {
        traverse(child, nodeId);
      }
    } else {
      const label = `${String(node.field)}: ${escapeLabel(formatValue(node.value))}`;
      lines.push(`  ${nodeId}("${label}")`);

      if (parentId) {
        lines.push(`  ${parentId} --> ${nodeId}`);
      }
    }
  };

  traverse(filter);

  return lines.join("\n");
}

function toBase64(str: string): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(str, "utf-8").toString("base64");
  }
  const bytes = new TextEncoder().encode(str);
  return btoa(String.fromCharCode(...bytes));
}

function getMermaidLiveUrl<Schema extends FilterSchemaConstraint>(
  filter: Group<Schema>,
): string {
  const code = generateMermaid(filter);
  const state = JSON.stringify({
    code,
    mermaid: { theme: "default" },
    autoSync: true,
  });
  const encoded = toBase64(state);
  return `https://mermaid.live/edit#base64:${encoded}`;
}

export { generateMermaid, getMermaidLiveUrl };
