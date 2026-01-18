"use client";

import {
  closestCenter,
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  booleanFilter,
  dateFilter,
  defineFilters,
  isCondition,
  isGroup,
  numberFilter,
  stringFilter,
  type Condition,
  type DateValue,
  type FilterExpression,
  type FilterValue,
  type Group,
  type GroupInput,
  type NumberValue,
  type StringValue,
} from "@jlnstack/filter";
import { getMermaidLiveUrl } from "@jlnstack/filter/devtools";
import { useFilterHook } from "@jlnstack/filter/react";
import { ChevronDown, ExternalLink, FolderOpen, GripVertical, Layers, Plus, Trash2, X } from "lucide-react";
import { type ReactNode, useMemo, useState } from "react";

// ============================================================================
// Filter Schema Definition
// ============================================================================

const schema = defineFilters({
  name: stringFilter({ label: "Name", placeholder: "Enter name..." }),
  email: stringFilter({ label: "Email", placeholder: "Enter email..." }),
  age: numberFilter({ label: "Age", min: 0, max: 150 }),
  score: numberFilter({ label: "Score", min: 0, max: 100 }),
  active: booleanFilter({ label: "Active", trueLabel: "Yes", falseLabel: "No" }),
  joinedAt: dateFilter({ label: "Joined" }),
});

type Schema = typeof schema;

// ============================================================================
// Sample Dataset
// ============================================================================

type Person = {
  id: number;
  name: string;
  email: string;
  age: number;
  score: number;
  active: boolean;
  joinedAt: Date;
};

const sampleData: Person[] = [
  { id: 1, name: "Alice Johnson", email: "alice@example.com", age: 28, score: 92, active: true, joinedAt: new Date("2023-01-15") },
  { id: 2, name: "Bob Smith", email: "bob@company.org", age: 34, score: 78, active: true, joinedAt: new Date("2022-06-20") },
  { id: 3, name: "Carol Williams", email: "carol@example.com", age: 45, score: 88, active: false, joinedAt: new Date("2021-11-03") },
  { id: 4, name: "David Brown", email: "david@startup.io", age: 23, score: 65, active: true, joinedAt: new Date("2024-02-28") },
  { id: 5, name: "Emma Davis", email: "emma@example.com", age: 31, score: 95, active: true, joinedAt: new Date("2023-08-10") },
  { id: 6, name: "Frank Miller", email: "frank@company.org", age: 52, score: 71, active: false, joinedAt: new Date("2020-04-15") },
  { id: 7, name: "Grace Wilson", email: "grace@startup.io", age: 29, score: 84, active: true, joinedAt: new Date("2023-12-01") },
  { id: 8, name: "Henry Taylor", email: "henry@example.com", age: 41, score: 59, active: false, joinedAt: new Date("2022-03-22") },
  { id: 9, name: "Ivy Anderson", email: "ivy@company.org", age: 26, score: 91, active: true, joinedAt: new Date("2024-01-05") },
  { id: 10, name: "Jack Thomas", email: "jack@startup.io", age: 38, score: 73, active: true, joinedAt: new Date("2021-09-18") },
  { id: 11, name: "Kate Martinez", email: "kate@example.com", age: 33, score: 87, active: false, joinedAt: new Date("2022-12-30") },
  { id: 12, name: "Leo Garcia", email: "leo@company.org", age: 47, score: 62, active: true, joinedAt: new Date("2023-05-14") },
];

// ============================================================================
// Filter Application Logic
// ============================================================================

function matchesStringFilter(
  value: string,
  filter: { operator: string; value: string }
): boolean {
  const filterValue = filter.value.toLowerCase();
  const itemValue = value.toLowerCase();

  switch (filter.operator) {
    case "eq":
      return itemValue === filterValue;
    case "neq":
      return itemValue !== filterValue;
    case "contains":
      return itemValue.includes(filterValue);
    case "startsWith":
      return itemValue.startsWith(filterValue);
    case "endsWith":
      return itemValue.endsWith(filterValue);
    default:
      return true;
  }
}

function matchesNumberFilter(
  value: number,
  filter: { operator: string; value: number }
): boolean {
  switch (filter.operator) {
    case "eq":
      return value === filter.value;
    case "neq":
      return value !== filter.value;
    case "gt":
      return value > filter.value;
    case "gte":
      return value >= filter.value;
    case "lt":
      return value < filter.value;
    case "lte":
      return value <= filter.value;
    default:
      return true;
  }
}

function matchesDateFilter(
  value: Date,
  filter: { operator: string; value: Date | string }
): boolean {
  const itemTime = value.getTime();
  const filterTime = new Date(filter.value).getTime();

  switch (filter.operator) {
    case "eq":
      return itemTime === filterTime;
    case "neq":
      return itemTime !== filterTime;
    case "gt":
      return itemTime > filterTime;
    case "gte":
      return itemTime >= filterTime;
    case "lt":
      return itemTime < filterTime;
    case "lte":
      return itemTime <= filterTime;
    default:
      return true;
  }
}

function matchesCondition(item: Person, condition: Condition<Schema>): boolean {
  const field = condition.field as keyof Person;
  const value = item[field];
  const filterValue = condition.value;

  const def = schema[condition.field];

  if (def.id === "string" && typeof value === "string") {
    return matchesStringFilter(value, filterValue as { operator: string; value: string });
  }

  if (def.id === "number" && typeof value === "number") {
    return matchesNumberFilter(value, filterValue as { operator: string; value: number });
  }

  if (def.id === "boolean" && typeof value === "boolean") {
    return value === filterValue;
  }

  if (def.id === "date" && value instanceof Date) {
    return matchesDateFilter(value, filterValue as { operator: string; value: Date | string });
  }

  return true;
}

function matchesGroup(item: Person, group: Group<Schema>): boolean {
  if (group.filters.length === 0) return true;

  const results = group.filters.map((filter) => {
    if (isCondition(filter)) {
      return matchesCondition(item, filter);
    }
    if (isGroup(filter)) {
      return matchesGroup(item, filter);
    }
    return true;
  });

  if (group.operator === "and") {
    return results.every(Boolean);
  }
  return results.some(Boolean);
}

function applyFilter(data: Person[], filter: Group<Schema>): Person[] {
  return data.filter((item) => matchesGroup(item, filter));
}

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

const dateOperatorLabels: Record<string, string> = {
  eq: "is",
  neq: "is not",
  gt: "after",
  gte: "on or after",
  lt: "before",
  lte: "on or before",
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
// Date Filter Field
// ============================================================================

function DateFilterField({
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
  const value = condition.value as { operator: string; value: string | Date };
  const [operatorOpen, setOperatorOpen] = useState(false);
  const def = definition as ReturnType<typeof dateFilter>;

  const dateString = value.value instanceof Date
    ? value.value.toISOString().split("T")[0]
    : typeof value.value === "string"
      ? value.value.split("T")[0]
      : "";

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
            {dateOperatorLabels[value.operator] || value.operator}
            <ChevronDown size={12} />
          </span>
        }
      >
        {Object.entries(dateOperatorLabels).map(([op, label]) => (
          <DropdownItem
            key={op}
            onClick={() => {
              onValueChange({ ...value, operator: op, value: dateString });
              setOperatorOpen(false);
            }}
          >
            {label}
          </DropdownItem>
        ))}
      </Dropdown>

      <input
        type="date"
        value={dateString}
        onChange={(e) => onValueChange({ operator: value.operator, value: e.target.value })}
        className="px-2 py-1 text-sm bg-neutral-800 border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-600"
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
// Sortable Item Wrapper
// ============================================================================

function SortableItem({
  id,
  children,
}: {
  id: string;
  children: ReactNode;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <button
        type="button"
        className="p-1 text-neutral-600 hover:text-neutral-400 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <div className="flex-1">{children}</div>
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

  if (filterType === "date") {
    return (
      <DateFilterField
        condition={condition}
        definition={definition}
        onValueChange={onValueChange as (v: { operator: string; value: string }) => void}
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

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const availableFields = [
    { field: "name" as const, label: "Name" },
    { field: "email" as const, label: "Email" },
    { field: "age" as const, label: "Age" },
    { field: "score" as const, label: "Score" },
    { field: "active" as const, label: "Active" },
    { field: "joinedAt" as const, label: "Joined" },
  ];

  const getDefaultValue = (field: keyof Schema): FilterValue<Schema[typeof field]> => {
    const def = schema[field];
    if (def.id === "string") return { operator: "contains", value: "" } as StringValue;
    if (def.id === "number") return { operator: "eq", value: 0 } as NumberValue;
    if (def.id === "boolean") return true;
    if (def.id === "date") return { operator: "gte", value: new Date().toISOString().split("T")[0] } as DateValue;
    return { operator: "eq", value: "" } as StringValue;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = group.filters.findIndex((f) => f.id === active.id);
      const newIndex = group.filters.findIndex((f) => f.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        filter.moveFilter({
          id: active.id as string,
          targetGroupId: group.id,
          index: newIndex,
        });
      }
    }
  };

  const filterIds = group.filters.map((f) => f.id);

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

      {/* Render filters with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={filterIds} strategy={verticalListSortingStrategy}>
          {group.filters.map((item: FilterExpression<Schema>) => {
            if (isCondition(item)) {
              return (
                <SortableItem key={item.id} id={item.id}>
                  <FilterCondition
                    condition={item}
                    onRemove={() => filter.removeFilter({ id: item.id })}
                    onValueChange={(value) =>
                      filter.updateCondition({
                        id: item.id,
                        value: value as FilterValue<Schema[typeof item.field]>,
                      })
                    }
                  />
                </SortableItem>
              );
            }
            if (isGroup(item)) {
              return (
                <SortableItem key={item.id} id={item.id}>
                  <FilterGroup group={item} filter={filter} />
                </SortableItem>
              );
            }
            return null;
          })}
        </SortableContext>
      </DndContext>

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
// Data Table Component
// ============================================================================

function DataTable({ data, total }: { data: Person[]; total: number }) {
  return (
    <div className="border border-neutral-800 rounded-lg overflow-hidden">
      <div className="px-4 py-2 bg-neutral-900/50 border-b border-neutral-800 flex items-center justify-between">
        <span className="text-xs text-neutral-400">
          Showing {data.length} of {total} results
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-neutral-900/30 border-b border-neutral-800">
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-400">Name</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-400">Email</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-400">Age</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-400">Score</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-400">Active</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-neutral-400">Joined</th>
            </tr>
          </thead>
          <tbody>
            {data.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-neutral-500">
                  No results match your filters
                </td>
              </tr>
            ) : (
              data.map((person) => (
                <tr
                  key={person.id}
                  className="border-b border-neutral-800/50 hover:bg-neutral-900/30 transition-colors"
                >
                  <td className="px-4 py-2 text-neutral-200">{person.name}</td>
                  <td className="px-4 py-2 text-neutral-400">{person.email}</td>
                  <td className="px-4 py-2 text-neutral-400">{person.age}</td>
                  <td className="px-4 py-2">
                    <span
                      className={`${
                        person.score >= 80
                          ? "text-green-400"
                          : person.score >= 60
                            ? "text-yellow-400"
                            : "text-red-400"
                      }`}
                    >
                      {person.score}
                    </span>
                  </td>
                  <td className="px-4 py-2">
                    <span
                      className={`inline-flex px-2 py-0.5 text-xs rounded ${
                        person.active
                          ? "bg-green-900/30 text-green-400"
                          : "bg-neutral-800 text-neutral-500"
                      }`}
                    >
                      {person.active ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-neutral-400">
                    {person.joinedAt.toLocaleDateString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================================
// Selectable Sortable Item
// ============================================================================

function SelectableSortableItem({
  id,
  children,
  isSelected,
  onToggleSelection,
}: {
  id: string;
  children: ReactNode;
  isSelected: boolean;
  onToggleSelection: (id: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={isSelected}
        onChange={() => onToggleSelection(id)}
        className="w-3.5 h-3.5 rounded border-neutral-600 bg-neutral-800 text-neutral-100 focus:ring-neutral-600 focus:ring-offset-0 cursor-pointer"
      />
      <button
        type="button"
        className="p-1 text-neutral-600 hover:text-neutral-400 cursor-grab active:cursor-grabbing touch-none"
        {...attributes}
        {...listeners}
      >
        <GripVertical size={14} />
      </button>
      <div className="flex-1">{children}</div>
    </div>
  );
}

// ============================================================================
// Filter Group With Selection
// ============================================================================

function FilterGroupWithSelection({
  group,
  filter,
  isRoot = false,
  selectedIds,
  onToggleSelection,
}: {
  group: Group<Schema>;
  filter: ReturnType<typeof useFilterHook<Schema>>;
  isRoot?: boolean;
  selectedIds: Set<string>;
  onToggleSelection: (id: string) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const availableFields = [
    { field: "name" as const, label: "Name" },
    { field: "email" as const, label: "Email" },
    { field: "age" as const, label: "Age" },
    { field: "score" as const, label: "Score" },
    { field: "active" as const, label: "Active" },
    { field: "joinedAt" as const, label: "Joined" },
  ];

  const getDefaultValue = (field: keyof Schema): FilterValue<Schema[typeof field]> => {
    const def = schema[field];
    if (def.id === "string") return { operator: "contains", value: "" } as StringValue;
    if (def.id === "number") return { operator: "eq", value: 0 } as NumberValue;
    if (def.id === "boolean") return true;
    if (def.id === "date") return { operator: "gte", value: new Date().toISOString().split("T")[0] } as DateValue;
    return { operator: "eq", value: "" } as StringValue;
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = group.filters.findIndex((f) => f.id === active.id);
      const newIndex = group.filters.findIndex((f) => f.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        filter.moveFilter({
          id: active.id as string,
          targetGroupId: group.id,
          index: newIndex,
        });
      }
    }
  };

  const filterIds = group.filters.map((f) => f.id);

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

      {/* Render filters with drag and drop */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext items={filterIds} strategy={verticalListSortingStrategy}>
          {group.filters.map((item: FilterExpression<Schema>) => {
            if (isCondition(item)) {
              return (
                <SelectableSortableItem
                  key={item.id}
                  id={item.id}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelection={onToggleSelection}
                >
                  <FilterCondition
                    condition={item}
                    onRemove={() => filter.removeFilter({ id: item.id })}
                    onValueChange={(value) =>
                      filter.updateCondition({
                        id: item.id,
                        value: value as FilterValue<Schema[typeof item.field]>,
                      })
                    }
                  />
                </SelectableSortableItem>
              );
            }
            if (isGroup(item)) {
              return (
                <SelectableSortableItem
                  key={item.id}
                  id={item.id}
                  isSelected={selectedIds.has(item.id)}
                  onToggleSelection={onToggleSelection}
                >
                  <FilterGroupWithSelection
                    group={item}
                    filter={filter}
                    selectedIds={selectedIds}
                    onToggleSelection={onToggleSelection}
                  />
                </SelectableSortableItem>
              );
            }
            return null;
          })}
        </SortableContext>
      </DndContext>

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
// Filter Presets
// ============================================================================

const presets: { name: string; filter: GroupInput<Schema> }[] = [
  {
    name: "High Performers",
    filter: {
      type: "group",
      operator: "and",
      filters: [
        { type: "condition", field: "score", value: { operator: "gte", value: 80 } },
        { type: "condition", field: "active", value: true },
      ],
    },
  },
  {
    name: "Recent Joiners",
    filter: {
      type: "group",
      operator: "and",
      filters: [
        { type: "condition", field: "joinedAt", value: { operator: "gte", value: "2023-01-01" } },
      ],
    },
  },
  {
    name: "Young or High Score",
    filter: {
      type: "group",
      operator: "or",
      filters: [
        { type: "condition", field: "age", value: { operator: "lt", value: 30 } },
        { type: "condition", field: "score", value: { operator: "gte", value: 90 } },
      ],
    },
  },
  {
    name: "Complex: Active + (Young OR High Score)",
    filter: {
      type: "group",
      operator: "and",
      filters: [
        { type: "condition", field: "active", value: true },
        {
          type: "group",
          operator: "or",
          filters: [
            { type: "condition", field: "age", value: { operator: "lt", value: 30 } },
            { type: "condition", field: "score", value: { operator: "gte", value: 85 } },
          ],
        },
      ],
    },
  },
];

// ============================================================================
// Main Page
// ============================================================================

export default function FilterPlaygroundPage() {
  const filter = useFilterHook(schema);
  const currentFilter = filter.useFilter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const filteredData = useMemo(
    () => applyFilter(sampleData, currentFilter),
    [currentFilter]
  );

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleGroup = () => {
    if (selectedIds.size >= 2) {
      filter.groupFilters({ ids: Array.from(selectedIds), operator: "and" });
      setSelectedIds(new Set());
    }
  };

  const handleUngroup = () => {
    if (selectedIds.size === 1) {
      const id = Array.from(selectedIds)[0];
      const item = filter.getFilterById(id);
      if (item && isGroup(item)) {
        filter.ungroupFilter({ id });
        setSelectedIds(new Set());
      }
    }
  };

  const canGroup = selectedIds.size >= 2;
  const canUngroup = selectedIds.size === 1 && (() => {
    const id = Array.from(selectedIds)[0];
    const item = filter.getFilterById(id);
    return item && isGroup(item) && !item.root;
  })();

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 p-8">
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-lg font-medium">Filter Playground</h1>
          <p className="text-sm text-neutral-400 mt-1">
            Build type-safe filter expressions with AND/OR grouping
          </p>
        </div>

        {/* Presets */}
        <div className="space-y-3">
          <h2 className="text-sm font-medium text-neutral-300">Presets</h2>
          <div className="flex flex-wrap gap-2">
            {presets.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => filter.setFilter(preset.filter)}
                className="px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 rounded transition-colors"
              >
                {preset.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column: Filter Builder */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-medium text-neutral-300">
                Filter Builder
              </h2>
              {selectedIds.size > 0 && (
                <span className="text-xs text-neutral-500">
                  {selectedIds.size} selected
                </span>
              )}
            </div>
            <div className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg">
              <FilterGroupWithSelection
                group={currentFilter}
                filter={filter}
                isRoot
                selectedIds={selectedIds}
                onToggleSelection={toggleSelection}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => filter.reset()}
                className="px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
              >
                Reset
              </button>
              <a
                href={getMermaidLiveUrl(currentFilter)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700 rounded transition-colors"
              >
                <ExternalLink size={14} />
                View Diagram
              </a>
              <div className="w-px h-4 bg-neutral-700" />
              <button
                type="button"
                onClick={handleGroup}
                disabled={!canGroup}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
                  canGroup
                    ? "text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700"
                    : "text-neutral-600 bg-neutral-800/50 cursor-not-allowed"
                }`}
              >
                <Layers size={14} />
                Group
              </button>
              <button
                type="button"
                onClick={handleUngroup}
                disabled={!canUngroup}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded transition-colors ${
                  canUngroup
                    ? "text-neutral-400 hover:text-neutral-200 bg-neutral-800 hover:bg-neutral-700"
                    : "text-neutral-600 bg-neutral-800/50 cursor-not-allowed"
                }`}
              >
                <FolderOpen size={14} />
                Ungroup
              </button>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="px-3 py-1.5 text-sm text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  Clear selection
                </button>
              )}
            </div>
          </div>

          {/* Right Column: Filter State */}
          <div className="space-y-4">
            <h2 className="text-sm font-medium text-neutral-300">Filter State</h2>
            <pre className="p-4 bg-neutral-900/50 border border-neutral-800 rounded-lg text-xs font-mono text-neutral-400 overflow-auto max-h-[400px]">
              {JSON.stringify(currentFilter, null, 2)}
            </pre>
          </div>
        </div>

        {/* Data Table */}
        <div className="space-y-4">
          <h2 className="text-sm font-medium text-neutral-300">Filtered Data</h2>
          <DataTable data={filteredData} total={sampleData.length} />
        </div>
      </div>
    </div>
  );
}
