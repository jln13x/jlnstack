"use client";

import { DndContext, type DragEndEvent, useDraggable } from "@dnd-kit/core";
import { createSnapModifier } from "@dnd-kit/modifiers";
import { CSS } from "@dnd-kit/utilities";
import {
  createModalManager,
  type ModalComponentOptions,
  type ModalInstance,
  modal,
} from "@jlnstack/modal";
import { ModalProvider, useModal, useModals } from "@jlnstack/modal/react";
import { FileText, HelpCircle, MessageSquare, Settings, X } from "lucide-react";
import { Dialog } from "radix-ui";
import { type ReactNode, useCallback, useRef, useState } from "react";

// ============================================================================
// Sample Modals
// ============================================================================

const alertModal = modal
  .input<{ title: string; message: string }>()
  .create((input, options) => (
    <AlertModalContent input={input} options={options} />
  ));

function AlertModalContent({
  input,
  options,
}: {
  input: { title: string; message: string };
  options: ModalComponentOptions<undefined>;
}) {
  return (
    <div className="space-y-4">
      <Dialog.Title className="text-sm font-medium">{input.title}</Dialog.Title>
      <Dialog.Description className="text-sm text-neutral-400">
        {input.message}
      </Dialog.Description>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => options.close()}
          className="px-3 py-1.5 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
}

const confirmModal = modal
  .input<{ message: string }>()
  .output<boolean>()
  .create((input, options) => (
    <ConfirmModalContent input={input} options={options} />
  ));

function ConfirmModalContent({
  input,
  options,
}: {
  input: { message: string };
  options: ModalComponentOptions<boolean>;
}) {
  return (
    <div className="space-y-4">
      <Dialog.Title className="text-sm font-medium">Confirm</Dialog.Title>
      <Dialog.Description className="text-sm text-neutral-400">
        {input.message}
      </Dialog.Description>
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => options.resolve(false)}
          className="px-3 py-1.5 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
        >
          No
        </button>
        <button
          type="button"
          onClick={() => options.resolve(true)}
          className="px-3 py-1.5 text-sm bg-neutral-100 text-neutral-900 hover:bg-white rounded transition-colors"
        >
          Yes
        </button>
      </div>
    </div>
  );
}

const formModal = modal
  .input<{ label: string; placeholder?: string }>()
  .output<string>()
  .create((input, options) => (
    <FormModalContent input={input} options={options} />
  ));

function FormModalContent({
  input,
  options,
}: {
  input: { label: string; placeholder?: string };
  options: ModalComponentOptions<string>;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="space-y-4">
      <Dialog.Title className="text-sm font-medium">{input.label}</Dialog.Title>
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={input.placeholder}
        className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500"
      />
      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => options.close()}
          className="px-3 py-1.5 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => options.resolve(value)}
          className="px-3 py-1.5 text-sm bg-neutral-100 text-neutral-900 hover:bg-white rounded transition-colors"
        >
          Submit
        </button>
      </div>
    </div>
  );
}

const settingsModal = modal
  .input<{}>()
  .create((_, options) => <SettingsModalContent options={options} />);

function SettingsModalContent({
  options,
}: {
  options: ModalComponentOptions<undefined>;
}) {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(true);
  const [autoSave, setAutoSave] = useState(false);

  return (
    <div className="space-y-4">
      <Dialog.Title className="text-sm font-medium">Settings</Dialog.Title>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">Notifications</span>
          <Toggle checked={notifications} onChange={setNotifications} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">Dark Mode</span>
          <Toggle checked={darkMode} onChange={setDarkMode} />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-neutral-300">Auto Save</span>
          <Toggle checked={autoSave} onChange={setAutoSave} />
        </div>
      </div>
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => options.close()}
          className="px-3 py-1.5 text-sm bg-neutral-700 hover:bg-neutral-600 rounded transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative w-9 h-5 rounded-full transition-colors ${
        checked ? "bg-neutral-100" : "bg-neutral-700"
      }`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full transition-transform ${
          checked ? "translate-x-4 bg-neutral-900" : "bg-neutral-400"
        }`}
      />
    </button>
  );
}

// ============================================================================
// Resize Handle Component
// ============================================================================

function ResizeHandle({
  onResize,
}: {
  onResize: (delta: { width: number; height: number }) => void;
}) {
  const [isResizing, setIsResizing] = useState(false);
  const startPos = useRef({ x: 0, y: 0 });

  const handlePointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setIsResizing(true);
    startPos.current = { x: e.clientX, y: e.clientY };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isResizing) return;
    const deltaX = e.clientX - startPos.current.x;
    const deltaY = e.clientY - startPos.current.y;
    startPos.current = { x: e.clientX, y: e.clientY };
    onResize({ width: deltaX, height: deltaY });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsResizing(false);
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  return (
    <div
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
    >
      <svg
        viewBox="0 0 16 16"
        aria-hidden="true"
        className="w-full h-full text-neutral-600 hover:text-neutral-400 transition-colors"
      >
        <path
          fill="currentColor"
          d="M14 14H12V12H14V14ZM14 10H12V8H14V10ZM10 14H8V12H10V14Z"
        />
      </svg>
    </div>
  );
}

// ============================================================================
// Draggable Modal Component
// ============================================================================

function DraggableModal({
  instance,
  isTop,
  onBringToFront,
  onResize,
}: {
  instance: ModalInstance;
  isTop: boolean;
  onBringToFront: () => void;
  onResize: (delta: { width: number; height: number }) => void;
}) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: instance.id,
  });

  const style = {
    left: instance.position?.x ?? 100,
    top: instance.position?.y ?? 100,
    width: instance.size?.width ?? 320,
    height: instance.size?.height ?? 200,
    transform: transform ? CSS.Translate.toString(transform) : undefined,
    zIndex: instance.order + 100,
  };

  return (
    <Dialog.Root open modal={false}>
      <Dialog.Portal>
        <Dialog.Content
          ref={setNodeRef}
          style={style}
          onPointerDown={onBringToFront}
          className={`fixed bg-neutral-900 border rounded-lg shadow-2xl outline-none transition-[shadow,opacity] flex flex-col ${
            isTop
              ? "border-neutral-500 shadow-neutral-900/50"
              : "border-neutral-800 shadow-neutral-950/50"
          }`}
        >
          {/* Title bar - draggable */}
          <div
            {...listeners}
            {...attributes}
            className="flex items-center justify-between px-3 py-2 border-b border-neutral-800 cursor-move select-none shrink-0"
          >
            <span className="text-xs text-neutral-500 font-mono">
              {instance.id}
            </span>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => instance.close()}
              className="p-0.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
            >
              <X size={14} />
            </button>
          </div>
          {/* Content */}
          <ModalInstanceProvider instance={instance}>
            <div className="p-4 flex-1 overflow-auto">
              {instance.render() as ReactNode}
            </div>
          </ModalInstanceProvider>
          {/* Resize handle */}
          <ResizeHandle onResize={onResize} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

// Context provider for modal instance (mirrors the outlet's behavior)
import { createContext } from "react";

type ModalInstanceContextValue = {
  close: () => void;
  resolve: (value: unknown) => void;
};

const ModalInstanceContext = createContext<ModalInstanceContextValue | null>(
  null,
);

function ModalInstanceProvider({
  instance,
  children,
}: {
  instance: ModalInstance;
  children: ReactNode;
}) {
  const close = useCallback(() => instance.close(), [instance]);
  const resolve = useCallback(
    (value: unknown) => instance.resolve(value),
    [instance],
  );

  return (
    <ModalInstanceContext.Provider value={{ close, resolve }}>
      {children}
    </ModalInstanceContext.Provider>
  );
}

// ============================================================================
// Playground Outlet
// ============================================================================

const MIN_WIDTH = 200;
const MIN_HEIGHT = 150;

function PlaygroundOutlet() {
  const { modals, isOnTop, bringToFront, setSize, getInstance } = useModals();

  const handleResize = (
    id: string,
    currentSize: { width: number; height: number },
    delta: { width: number; height: number },
  ) => {
    setSize(id, {
      width: Math.max(MIN_WIDTH, currentSize.width + delta.width),
      height: Math.max(MIN_HEIGHT, currentSize.height + delta.height),
    });
  };

  return (
    <>
      {modals.map((modal) => {
        const instance = getInstance(modal.id);
        if (!instance) return null;
        return (
          <DraggableModal
            key={modal.id}
            instance={instance}
            isTop={isOnTop(modal.id)}
            onBringToFront={() => bringToFront(modal.id)}
            onResize={(delta) =>
              handleResize(
                modal.id,
                modal.size ?? { width: 320, height: 200 },
                delta,
              )
            }
          />
        );
      })}
    </>
  );
}

// ============================================================================
// Taskbar
// ============================================================================

function Taskbar() {
  const { modals, bringToFront, close, isOnTop } = useModals();

  if (modals.length === 0) return null;

  // Sort by ID to maintain stable creation order in taskbar
  const sortedModals = [...modals].sort((a, b) =>
    a.id.localeCompare(b.id, undefined, { numeric: true }),
  );

  return (
    <div className="fixed bottom-0 inset-x-0 h-10 bg-neutral-900 border-t border-neutral-800 flex items-center px-2 gap-1">
      {sortedModals.map((modal) => (
        <button
          key={modal.id}
          type="button"
          onClick={() => bringToFront(modal.id)}
          className={`group flex items-center gap-2 px-3 py-1.5 text-xs font-mono rounded transition-colors ${
            isOnTop(modal.id)
              ? "bg-neutral-700 text-neutral-100"
              : "bg-neutral-800 text-neutral-400 hover:bg-neutral-700 hover:text-neutral-200"
          }`}
        >
          <span>{modal.id}</span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              close(modal.id);
            }}
            className="p-0.5 opacity-0 group-hover:opacity-100 hover:bg-neutral-600 rounded transition-opacity"
          >
            <X size={12} />
          </button>
        </button>
      ))}
    </div>
  );
}

// ============================================================================
// Desktop Icons
// ============================================================================

function Desktop() {
  const alert = useModal(alertModal);
  const confirm = useModal(confirmModal);
  const form = useModal(formModal);
  const settings = useModal(settingsModal);

  const [lastResult, setLastResult] = useState<string | null>(null);

  const handleAlert = async () => {
    await alert.open({
      title: "Alert",
      message: "This is an alert message. Click OK to dismiss.",
    });
    setLastResult("Alert closed");
  };

  const handleConfirm = async () => {
    const result = await confirm.open({
      message: "Are you sure you want to proceed with this action?",
    });
    setLastResult(`Confirm: ${result ? "Yes" : "No/Cancelled"}`);
  };

  const handleForm = async () => {
    const result = await form.open({
      label: "Enter your name",
      placeholder: "John Doe",
    });
    setLastResult(`Form: ${result ?? "Cancelled"}`);
  };

  const handleSettings = async () => {
    await settings.open({});
    setLastResult("Settings closed");
  };

  return (
    <div className="p-6">
      <h1 className="text-lg font-medium text-neutral-100 mb-6">
        Modal Playground
      </h1>
      <div className="grid grid-cols-4 gap-4 max-w-md">
        <DesktopIcon
          icon={<MessageSquare size={24} />}
          label="Alert"
          onClick={handleAlert}
        />
        <DesktopIcon
          icon={<HelpCircle size={24} />}
          label="Confirm"
          onClick={handleConfirm}
        />
        <DesktopIcon
          icon={<FileText size={24} />}
          label="Form"
          onClick={handleForm}
        />
        <DesktopIcon
          icon={<Settings size={24} />}
          label="Settings"
          onClick={handleSettings}
        />
      </div>
      {lastResult && (
        <p className="mt-6 text-xs text-neutral-500 font-mono">
          Last result: {lastResult}
        </p>
      )}
    </div>
  );
}

function DesktopIcon({
  icon,
  label,
  onClick,
}: {
  icon: ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-center gap-2 p-4 rounded-lg hover:bg-neutral-800/50 transition-colors group"
    >
      <div className="text-neutral-400 group-hover:text-neutral-200 transition-colors">
        {icon}
      </div>
      <span className="text-xs text-neutral-400 group-hover:text-neutral-200 transition-colors">
        {label}
      </span>
    </button>
  );
}

// ============================================================================
// Grid Configuration
// ============================================================================

const GRID_SIZE = 20; // pixels
const snapToGridModifier = createSnapModifier(GRID_SIZE);

// ============================================================================
// Grid Background
// ============================================================================

function GridBackground() {
  return (
    <div
      className="absolute inset-0 pointer-events-none"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(255,255,255,0.03) 1px, transparent 1px)
        `,
        backgroundSize: `${GRID_SIZE}px ${GRID_SIZE}px`,
      }}
    />
  );
}

// ============================================================================
// Main Page
// ============================================================================

export default function ModalPlaygroundPage() {
  const [manager] = useState(() => createModalManager());

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const id = active.id as string;

    if (delta.x !== 0 || delta.y !== 0) {
      const modal = manager.getAll().find((m) => m.id === id);
      const currentX = modal?.position?.x ?? 100;
      const currentY = modal?.position?.y ?? 100;
      manager.setPosition(id, {
        x: currentX + delta.x,
        y: currentY + delta.y,
      });
    }
  };

  return (
    <DndContext modifiers={[snapToGridModifier]} onDragEnd={handleDragEnd}>
      <ModalProvider manager={manager}>
        <div className="h-screen w-screen bg-neutral-950 overflow-hidden text-neutral-100 relative">
          <GridBackground />
          <Desktop />
          <Debug />
          <PlaygroundOutlet />
          <Taskbar />
        </div>
      </ModalProvider>
    </DndContext>
  );
}

const Debug = () => {
  const { modals } = useModals();
  return (
    <div>
      <pre>{JSON.stringify(modals, null, 2)}</pre>
    </div>
  );
};
