"use client";

import {
  booleanFilter,
  defineFilters,
  isCondition,
  isGroup,
  numberFilter,
  stringFilter,
  type Condition,
  type FilterExpression,
  type FilterValue,
  type Group,
  type NumberValue,
  type StringValue,
} from "@jlnstack/filter";
import { useFilterHook } from "@jlnstack/filter/react";
import { ChevronDown, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";

// ============================================================================
// Filter Schema Definition
// ============================================================================

const schema = defineFilters({
  name: stringFilter({ label: "Name", placeholder: "Enter name..." }),
  email: stringFilter({ label: "Email", placeholder: "Enter email..." }),
  age: numberFilter({ label: "Age", min: 0, max: 150 }),
  score: numberFilter({ label: "Score", min: 0, max: 100 }),
  active: booleanFilter({ label: "Active", trueLabel: "Yes", falseLabel: "No" }),
});

type Schema = typeof schema;

// ============================================================================
// Operator Labels
// ============================================================================

const stringOperatorLabels: Record<string, string> = {
  eq: "equals",
  neq: "not equals",
  contains: "contains",
  startsWith: "starts with",
  endsWith: "ends with",
};

const numberOperatorLabels: Record<string, string> = {
  eq: "=",
  neq: "≠",
  gt: ">",
  gte: "≥",
  lt: "<",
  lte: "≤",
};

// ============================================================================
// Dropdown Component
// ============================================================================

function Dropdown({
  trigger,
  children,
  open,
  onOpenChange,
}: {
  trigger: React.ReactNode;
  children: React.ReactNode;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className="flex items-center gap-1"
      >
        {trigger}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => onOpenChange(false)}
          />
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[140px] bg-neutral-900 border border-neutral-800 rounded-md shadow-lg py-1">
            {children}
          </div>
        </>
      )}
    </div>
  );
}

function DropdownItem({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full px-3 py-1.5 text-left text-sm text-neutral-300 hover:bg-neutral-800 hover:text-neutral-100 transition-colors"
    >
      {children}
    </button>
  );
}

// ============================================================================
// String Filter Field
// ============================================================================

function StringFilterField({
  condition,
  definition,
  onValueChange,
  onRemove,
}: {
  condition: Condition<Schema>;
  definition: (typeof schema)[keyof typeof schema];
  onValueChange: (value: { operator: string; value: string }) => void;
  onRemove: () => void;
}) {
  const value = condition.value as { operator: string; value: string };
  const [operatorOpen, setOperatorOpen] = useState(false);
  const def = definition as ReturnType<typeof stringFilter>;

  return (
    <div className="flex items-center gap-2 p-2 bg-neutral-900 border border-neutral-800 rounded-md">
      <span className="text-sm text-neutral-400 min-w-[60px]">
        {def.label || String(condition.field)}
      </span>

      <Dropdown
        open={operatorOpen}
        onOpenChange={setOperatorOpen}
        trigger={
          <span className="px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded transition-colors flex items-center gap-1">
            {stringOperatorLabels[value.operator] || value.operator}
            <ChevronDown size={12} />
          </span>
        }
      >
        {Object.entries(stringOperatorLabels).map(([op, label]) => (
          <DropdownItem
            key={op}
            onClick={() => {
              onValueChange({ ...value, operator: op });
              setOperatorOpen(false);
            }}
          >
            {label}
          </DropdownItem>
        ))}
      </Dropdown>

      <input
        type="text"
        value={value.value}
        onChange={(e) => onValueChange({ ...value, value: e.target.value })}
        placeholder={def.placeholder}
        className="flex-1 px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-600"
      />

      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ============================================================================
// Number Filter Field
// ============================================================================

function NumberFilterField({
  condition,
  definition,
  onValueChange,
  onRemove,
}: {
  condition: Condition<Schema>;
  definition: (typeof schema)[keyof typeof schema];
  onValueChange: (value: { operator: string; value: number }) => void;
  onRemove: () => void;
}) {
  const value = condition.value as { operator: string; value: number };
  const [operatorOpen, setOperatorOpen] = useState(false);
  const def = definition as ReturnType<typeof numberFilter>;

  return (
    <div className="flex items-center gap-2 p-2 bg-neutral-900 border border-neutral-800 rounded-md">
      <span className="text-sm text-neutral-400 min-w-[60px]">
        {def.label || String(condition.field)}
      </span>

      <Dropdown
        open={operatorOpen}
        onOpenChange={setOperatorOpen}
        trigger={
          <span className="px-2 py-1 text-xs bg-neutral-800 hover:bg-neutral-700 rounded transition-colors flex items-center gap-1">
            {numberOperatorLabels[value.operator] || value.operator}
            <ChevronDown size={12} />
          </span>
        }
      >
        {Object.entries(numberOperatorLabels).map(([op, label]) => (
          <DropdownItem
            key={op}
            onClick={() => {
              onValueChange({ ...value, operator: op });
              setOperatorOpen(false);
            }}
          >
            {label}
          </DropdownItem>
        ))}
      </Dropdown>

      <input
        type="number"
        value={value.value}
        onChange={(e) =>
          onValueChange({ ...value, value: parseFloat(e.target.value) || 0 })
        }
        min={def.min}
        max={def.max}
        className="w-24 px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-600"
      />

      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ============================================================================
// Boolean Filter Field
// ============================================================================

function BooleanFilterField({
  condition,
  definition,
  onValueChange,
  onRemove,
}: {
  condition: Condition<Schema>;
  definition: (typeof schema)[keyof typeof schema];
  onValueChange: (value: boolean) => void;
  onRemove: () => void;
}) {
  const value = condition.value as boolean;
  const def = definition as ReturnType<typeof booleanFilter>;

  return (
    <div className="flex items-center gap-2 p-2 bg-neutral-900 border border-neutral-800 rounded-md">
      <span className="text-sm text-neutral-400 min-w-[60px]">
        {def.label || String(condition.field)}
      </span>

      <span className="text-sm text-neutral-500">is</span>

      <button
        type="button"
        onClick={() => onValueChange(!value)}
        className={`px-3 py-1 text-sm rounded transition-colors ${
          value
            ? "bg-neutral-100 text-neutral-900"
            : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700"
        }`}
      >
        {value ? (def.trueLabel || "True") : (def.falseLabel || "False")}
      </button>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onRemove}
        className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

// ============================================================================
// Filter Condition Renderer
// ============================================================================

function FilterCondition({
  condition,
  onRemove,
  onValueChange,
}: {
  condition: Condition<Schema>;
  onRemove: () => void;
  onValueChange: (value: unknown) => void;
}) {
  const definition = schema[condition.field];
  const filterType = definition.id;

  if (filterType === "string") {
    return (
      <StringFilterField
        condition={condition}
        definition={definition}
        onValueChange={onValueChange as (v: { operator: string; value: string }) => void}
        onRemove={onRemove}
      />
    );
  }

  if (filterType === "number") {
    return (
      <NumberFilterField
        condition={condition}
        definition={definition}
        onValueChange={onValueChange as (v: { operator: string; value: number }) => void}
        onRemove={onRemove}
      />
    );
  }

  if (filterType === "boolean") {
    return (
      <BooleanFilterField
        condition={condition}
        definition={definition}
        onValueChange={onValueChange as (v: boolean) => void}
        onRemove={onRemove}
      />
    );
  }

  return null;
}

// ============================================================================
// Filter Group Renderer
// ============================================================================

function FilterGroup({
  group,
  filter,
  isRoot = false,
}: {
  group: Group<Schema>;
  filter: ReturnType<typeof useFilterHook<Schema>>;
  isRoot?: boolean;
}) {
  const [addOpen, setAddOpen] = useState(false);

  const availableFields = [
    { field: "name" as const, label: "Name" },
    { field: "email" as const, label: "Email" },
    { field: "age" as const, label: "Age" },
    { field: "score" as const, label: "Score" },
    { field: "active" as const, label: "Active" },
  ];

  const getDefaultValue = (field: keyof Schema): FilterValue<Schema[typeof field]> => {
    const def = schema[field];
    if (def.id === "string") return { operator: "contains", value: "" } as StringValue;
    if (def.id === "number") return { operator: "eq", value: 0 } as NumberValue;
    if (def.id === "boolean") return true;
    return { operator: "eq", value: "" } as StringValue;
  };

  return (
    <div
      className={`space-y-2 ${!isRoot ? "ml-4 pl-4 border-l border-neutral-800" : ""}`}
    >
      {/* Group operator toggle */}
      {group.filters.length > 1 && (
        <div className="flex items-center gap-2 text-xs">
          <span className="text-neutral-500">Match</span>
          <button
            type="button"
            onClick={() =>
              filter.setOperator({
                id: group.id,
                operator: group.operator === "and" ? "or" : "and",
              })
            }
            className={`px-2 py-0.5 rounded transition-colors ${
              group.operator === "and"
                ? "bg-neutral-100 text-neutral-900"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            ALL
          </button>
          <button
            type="button"
            onClick={() =>
              filter.setOperator({
                id: group.id,
                operator: group.operator === "and" ? "or" : "and",
              })
            }
            className={`px-2 py-0.5 rounded transition-colors ${
              group.operator === "or"
                ? "bg-neutral-100 text-neutral-900"
                : "bg-neutral-800 text-neutral-400"
            }`}
          >
            ANY
          </button>
          <span className="text-neutral-500">of the following</span>
        </div>
      )}

      {/* Render filters */}
      {group.filters.map((item: FilterExpression<Schema>) => {
        if (isCondition(item)) {
          return (
            <FilterCondition
              key={item.id}
              condition={item}
              onRemove={() => filter.removeFilter({ id: item.id })}
              onValueChange={(value) =>
                filter.updateCondition({
                  id: item.id,
                  value: value as FilterValue<Schema[typeof item.field]>,
                })
              }
            />
          );
        }
        if (isGroup(item)) {
          return <FilterGroup key={item.id} group={item} filter={filter} />;
        }
        return null;
      })}

      {/* Add filter button */}
      <div className="flex items-center gap-2">
        <Dropdown
          open={addOpen}
          onOpenChange={setAddOpen}
          trigger={
            <span className="flex items-center gap-1 px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800 rounded transition-colors">
              <Plus size={14} />
              Add filter
            </span>
          }
        >
          {availableFields.map(({ field, label }) => (
            <DropdownItem
              key={field}
              onClick={() => {
                filter.addCondition({
                  field,
                  value: getDefaultValue(field),
                  groupId: group.id,
                });
                setAddOpen(false);
              }}
            >
              {label}
            </DropdownItem>
          ))}
          <div className="border-t border-neutral-800 my-1" />
          <DropdownItem
            onClick={() => {
              filter.addGroup({ operator: "and", groupId: group.id });
              setAddOpen(false);
            }}
          >
            Add group
          </DropdownItem>
        </Dropdown>

        {!isRoot && (
          <button
            type="button"
            onClick={() => filter.removeFilter({ id: group.id })}
            className="p-1 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
          >
            <Trash2 size={14} />
          </button>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function FilterPlaygroundPage() {
  const filter = useFilterHook(schema);
  const currentFilter = filter.useFilter();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-lg font-medium">Filter Playground</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Build type-safe filter expressions with AND/OR grouping
          </p>
        </div>

        {/* Filter Builder */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-neutral-300">
            Filter Builder
          </h2>
          <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg">
            <FilterGroup group={currentFilter} filter={filter} isRoot />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => filter.reset()}
            className="px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
          >
            Reset
          </button>
        </div>

        {/* Debug Output */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-neutral-300">Filter State</h2>
          <pre className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-400 overflow-auto">
            {JSON.stringify(currentFilter, null, 2)}
          </pre>
        </div>
      </div>
    </div>
  );
}
