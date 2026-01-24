"use client";

import { createHttpNotificationManager } from "@jlnstack/notifications/client";
import {
  createNotificationClient,
  NotificationClientProvider,
  useNotifications,
} from "@jlnstack/notifications/react";
import {
  AlertCircle,
  Archive,
  Bell,
  Check,
  CheckCheck,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings,
  Trash2,
} from "lucide-react";
import { useState } from "react";
import { transformer } from "./server";

// ============================================================================
// Client Setup
// ============================================================================

const manager = createHttpNotificationManager({
  baseUrl: "/playground/notification/api",
  transformer,
});

const notificationClient = createNotificationClient(manager);

// ============================================================================
// Sample Data
// ============================================================================

const sampleNotifications = [
  {
    type: "message" as const,
    title: "New message from Alice",
    data: { from: "alice", preview: "Hey, are you free for a call?" },
  },
  {
    type: "alert" as const,
    title: "Payment failed",
    data: { severity: "error" as const },
  },
  {
    type: "message" as const,
    title: "Bob shared a document",
    data: { from: "bob", preview: "Check out this proposal" },
  },
  {
    type: "system" as const,
    title: "System maintenance scheduled",
    data: { action: "Scheduled for 2am UTC" },
  },
  {
    type: "alert" as const,
    title: "New login detected",
    data: { severity: "warning" as const },
  },
];

// ============================================================================
// Notification Icon
// ============================================================================

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "message":
      return <MessageSquare size={16} className="text-blue-400" />;
    case "alert":
      return <AlertCircle size={16} className="text-amber-400" />;
    case "system":
      return <Settings size={16} className="text-neutral-400" />;
    default:
      return <Bell size={16} className="text-neutral-400" />;
  }
}

// ============================================================================
// Notification Item
// ============================================================================

function NotificationItem({
  notification,
  onMarkAsRead,
  onArchive,
  onDelete,
}: {
  notification: {
    id: string;
    type: string;
    title: string;
    read: boolean;
    archived: boolean;
    createdAt: Date;
    data: unknown;
  };
  onMarkAsRead: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className={`group relative p-4 border-b border-neutral-800 transition-colors ${
        notification.read ? "bg-neutral-900/50" : "bg-neutral-900"
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="mt-0.5">
          <NotificationIcon type={notification.type} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium truncate ${
                notification.read ? "text-neutral-400" : "text-neutral-100"
              }`}
            >
              {notification.title}
            </span>
            {!notification.read && (
              <span className="w-2 h-2 bg-blue-500 rounded-full shrink-0" />
            )}
          </div>
          <p className="text-xs text-neutral-500 mt-0.5">
            {notification.type} • {notification.createdAt.toLocaleTimeString()}
          </p>
          {notification.type === "message" && (
            <p className="text-sm text-neutral-400 mt-1 truncate">
              {(notification.data as { preview: string }).preview}
            </p>
          )}
          {notification.type === "alert" && (
            <span
              className={`inline-block mt-1 px-2 py-0.5 text-xs rounded ${
                (notification.data as { severity: string }).severity === "error"
                  ? "bg-red-500/20 text-red-400"
                  : (notification.data as { severity: string }).severity ===
                      "warning"
                    ? "bg-amber-500/20 text-amber-400"
                    : "bg-blue-500/20 text-blue-400"
              }`}
            >
              {(notification.data as { severity: string }).severity}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {!notification.read && (
            <button
              type="button"
              onClick={onMarkAsRead}
              className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
              title="Mark as read"
            >
              <Check size={14} />
            </button>
          )}
          <button
            type="button"
            onClick={onArchive}
            className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
            title={notification.archived ? "Unarchive" : "Archive"}
          >
            <Archive size={14} />
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 text-neutral-500 hover:text-red-400 hover:bg-neutral-800 rounded transition-colors"
            title="Delete"
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Notification Inbox
// ============================================================================

function NotificationInbox({
  recipientId: _recipientId,
}: {
  recipientId: string;
}) {
  const [filter, setFilter] = useState<"all" | "unread" | "archived">("all");

  const { manager, data, isPending, refetch } = useNotifications({
    filter: {
      ...(filter === "unread" ? { read: false } : {}),
      ...(filter === "archived" ? { archived: true } : {}),
    },
  });

  const handleMarkAsRead = async (id: string) => {
    await manager.markAsRead(id);
    refetch();
  };

  const handleArchive = async (id: string, archived: boolean) => {
    if (archived) {
      await manager.unarchive(id);
    } else {
      await manager.archive(id);
    }
    refetch();
  };

  const handleDelete = async (id: string) => {
    await manager.delete(id);
    refetch();
  };

  const handleMarkAllAsRead = async () => {
    await manager.markAllAsRead();
    refetch();
  };

  const handleSendRandom = async () => {
    const sample =
      sampleNotifications[
        Math.floor(Math.random() * sampleNotifications.length)
      ];
    if (!sample) return;

    await manager.send({
      type: sample.type,
      title: sample.title,
      data: sample.data,
    });
    refetch();
  };

  const unreadCount = data.filter((n) => !n.read).length;

  return (
    <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-neutral-800">
        <div className="flex items-center gap-2">
          <Bell size={18} className="text-neutral-400" />
          <span className="font-medium text-neutral-100">Notifications</span>
          {unreadCount > 0 && (
            <span className="px-1.5 py-0.5 text-xs bg-blue-500 text-white rounded-full">
              {unreadCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleSendRandom}
            className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
            title="Add random notification"
          >
            <Plus size={16} />
          </button>
          <button
            type="button"
            onClick={refetch}
            className={`p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors ${
              isPending ? "animate-spin" : ""
            }`}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>
          <button
            type="button"
            onClick={handleMarkAllAsRead}
            className="p-1.5 text-neutral-500 hover:text-neutral-300 hover:bg-neutral-800 rounded transition-colors"
            title="Mark all as read"
          >
            <CheckCheck size={16} />
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex border-b border-neutral-800">
        {(["all", "unread", "archived"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setFilter(tab)}
            className={`flex-1 px-4 py-2 text-sm capitalize transition-colors ${
              filter === tab
                ? "text-neutral-100 border-b-2 border-blue-500"
                : "text-neutral-500 hover:text-neutral-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Notification list */}
      <div className="max-h-96 overflow-y-auto">
        {isPending && data.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">Loading...</div>
        ) : data.length === 0 ? (
          <div className="p-8 text-center text-neutral-500">
            <Mail size={32} className="mx-auto mb-2 opacity-50" />
            <p>No notifications</p>
          </div>
        ) : (
          data.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkAsRead={() => handleMarkAsRead(notification.id)}
              onArchive={() =>
                handleArchive(notification.id, notification.archived)
              }
              onDelete={() => handleDelete(notification.id)}
            />
          ))
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-neutral-800 text-center">
        <span className="text-xs text-neutral-500">
          {data.length} notification{data.length !== 1 ? "s" : ""}
          {filter !== "all" ? ` (${filter})` : ""}
        </span>
      </div>
    </div>
  );
}

// ============================================================================
// Send Notification Panel
// ============================================================================

function SendNotificationPanel({
  recipientId: _recipientId,
}: {
  recipientId: string;
}) {
  const { manager, refetch } = useNotifications();
  const [type, setType] = useState<"message" | "alert" | "system">("message");
  const [title, setTitle] = useState("");
  const [from, setFrom] = useState("");
  const [preview, setPreview] = useState("");
  const [severity, setSeverity] = useState<"info" | "warning" | "error">(
    "info",
  );

  const handleSend = async () => {
    if (!title) return;

    let data: Record<string, unknown>;
    if (type === "message") {
      data = { from: from || "unknown", preview: preview || "" };
    } else if (type === "alert") {
      data = { severity };
    } else {
      data = {};
    }

    await manager.send({ type, title, data });

    setTitle("");
    setFrom("");
    setPreview("");
    refetch();
  };

  return (
    <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-lg p-4">
      <h3 className="text-sm font-medium text-neutral-100 mb-4">
        Send Notification
      </h3>

      <div className="space-y-3">
        <div>
          <label
            htmlFor="notif-type"
            className="block text-xs text-neutral-500 mb-1"
          >
            Type
          </label>
          <select
            id="notif-type"
            value={type}
            onChange={(e) =>
              setType(e.target.value as "message" | "alert" | "system")
            }
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500 text-neutral-100"
          >
            <option value="message">Message</option>
            <option value="alert">Alert</option>
            <option value="system">System</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="notif-title"
            className="block text-xs text-neutral-500 mb-1"
          >
            Title
          </label>
          <input
            id="notif-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Notification title"
            className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500 text-neutral-100 placeholder:text-neutral-600"
          />
        </div>

        {type === "message" && (
          <>
            <div>
              <label
                htmlFor="notif-from"
                className="block text-xs text-neutral-500 mb-1"
              >
                From
              </label>
              <input
                id="notif-from"
                type="text"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder="Sender name"
                className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500 text-neutral-100 placeholder:text-neutral-600"
              />
            </div>
            <div>
              <label
                htmlFor="notif-preview"
                className="block text-xs text-neutral-500 mb-1"
              >
                Preview
              </label>
              <input
                id="notif-preview"
                type="text"
                value={preview}
                onChange={(e) => setPreview(e.target.value)}
                placeholder="Message preview"
                className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500 text-neutral-100 placeholder:text-neutral-600"
              />
            </div>
          </>
        )}

        {type === "alert" && (
          <div>
            <label
              htmlFor="notif-severity"
              className="block text-xs text-neutral-500 mb-1"
            >
              Severity
            </label>
            <select
              id="notif-severity"
              value={severity}
              onChange={(e) =>
                setSeverity(e.target.value as "info" | "warning" | "error")
              }
              className="w-full px-3 py-2 text-sm bg-neutral-800 border border-neutral-700 rounded focus:outline-none focus:ring-1 focus:ring-neutral-500 text-neutral-100"
            >
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="error">Error</option>
            </select>
          </div>
        )}

        <button
          type="button"
          onClick={handleSend}
          disabled={!title}
          className="w-full px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 disabled:bg-neutral-700 disabled:text-neutral-500 text-white rounded transition-colors"
        >
          Send Notification
        </button>
      </div>
    </div>
  );
}

// ============================================================================
// Main Page
// ============================================================================

const RECIPIENT_ID = "recipient_demo";

export default function NotificationPlaygroundPage() {
  return (
    <NotificationClientProvider client={notificationClient}>
      <div className="min-h-screen bg-neutral-950 text-neutral-100 p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold mb-2">Notification Playground</h1>
          <p className="text-neutral-500 mb-8">
            Interactive demo of @jlnstack/notifications
          </p>

          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h2 className="text-sm font-medium text-neutral-400 mb-3">
                Inbox
              </h2>
              <NotificationInbox recipientId={RECIPIENT_ID} />
            </div>
            <div>
              <h2 className="text-sm font-medium text-neutral-400 mb-3">
                Send
              </h2>
              <SendNotificationPanel recipientId={RECIPIENT_ID} />
            </div>
          </div>
        </div>
      </div>
    </NotificationClientProvider>
  );
}
