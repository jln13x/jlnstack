"use server";

import { Suspense } from "react";

// =============================================================================
// Simulated database/API calls
// =============================================================================

async function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchUser(id: string) {
  await delay(800);
  return {
    id,
    name: "John Doe",
    email: "john@example.com",
    role: "Admin",
    createdAt: new Date().toISOString(),
  };
}

async function fetchUserPosts(userId: string) {
  await delay(1200);
  return [
    { id: "1", title: "First Post", likes: 42 },
    { id: "2", title: "Another Post", likes: 18 },
    { id: "3", title: "Latest Update", likes: 7 },
  ];
}

async function fetchInvoice(id: string) {
  await delay(600);
  return {
    id,
    number: `INV-${id.toUpperCase()}`,
    customer: "Acme Corp",
    total: 1234.56,
    status: "paid" as const,
    items: [
      { description: "Consulting Services", amount: 800 },
      { description: "Development Work", amount: 400 },
      { description: "Support Fee", amount: 34.56 },
    ],
  };
}

// =============================================================================
// Skeleton Components
// =============================================================================

function UserCardSkeleton() {
  return (
    <div className="p-3 bg-neutral-800 rounded-lg animate-pulse">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-neutral-700" />
        <div className="space-y-1">
          <div className="w-24 h-4 bg-neutral-700 rounded" />
          <div className="w-16 h-3 bg-neutral-700 rounded" />
        </div>
      </div>
    </div>
  );
}

function PostsSkeleton() {
  return (
    <div className="space-y-2">
      <div className="w-20 h-4 bg-neutral-700 rounded animate-pulse" />
      {["one", "two", "three"].map((key) => (
        <div
          key={key}
          className="p-2 bg-neutral-800 rounded animate-pulse h-10"
        />
      ))}
    </div>
  );
}

// =============================================================================
// Server Actions (these are the actual server-rendered content)
// =============================================================================

export async function renderUserProfile({ userId }: { userId: string }) {
  const user = await fetchUser(userId);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg">
          {user.name.charAt(0)}
        </div>
        <div>
          <h3 className="font-semibold text-neutral-100">{user.name}</h3>
          <p className="text-sm text-neutral-400">{user.email}</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="text-neutral-400">Role</div>
        <div className="text-neutral-200">{user.role}</div>
        <div className="text-neutral-400">User ID</div>
        <div className="text-neutral-200 font-mono">{user.id}</div>
      </div>
    </div>
  );
}

export async function renderInvoice({ invoiceId }: { invoiceId: string }) {
  const invoice = await fetchInvoice(invoiceId);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-neutral-100">{invoice.number}</h3>
          <p className="text-sm text-neutral-400">{invoice.customer}</p>
        </div>
        <span
          className={`px-2 py-0.5 text-xs rounded-full ${
            invoice.status === "paid"
              ? "bg-green-500/20 text-green-400"
              : "bg-yellow-500/20 text-yellow-400"
          }`}
        >
          {invoice.status}
        </span>
      </div>

      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-700">
            <th className="text-left py-2 text-neutral-400 font-normal">
              Description
            </th>
            <th className="text-right py-2 text-neutral-400 font-normal">
              Amount
            </th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item) => (
            <tr
              key={`${item.description}-${item.amount}`}
              className="border-b border-neutral-800"
            >
              <td className="py-2 text-neutral-200">{item.description}</td>
              <td className="py-2 text-right text-neutral-200">
                ${item.amount.toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <td className="py-2 font-semibold text-neutral-100">Total</td>
            <td className="py-2 text-right font-semibold text-neutral-100">
              ${invoice.total.toFixed(2)}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// Async server components for progressive loading
async function UserCard({ userId }: { userId: string }) {
  const user = await fetchUser(userId);

  return (
    <div className="p-3 bg-neutral-800 rounded-lg">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-bold">
          {user.name.charAt(0)}
        </div>
        <div>
          <p className="text-sm font-medium text-neutral-100">{user.name}</p>
          <p className="text-xs text-neutral-400">{user.role}</p>
        </div>
      </div>
    </div>
  );
}

async function UserPosts({ userId }: { userId: string }) {
  const posts = await fetchUserPosts(userId);

  return (
    <div className="space-y-2">
      <h4 className="text-sm font-medium text-neutral-300">Recent Posts</h4>
      {posts.map((post) => (
        <div
          key={post.id}
          className="p-2 bg-neutral-800 rounded flex justify-between items-center"
        >
          <span className="text-sm text-neutral-200">{post.title}</span>
          <span className="text-xs text-neutral-500">{post.likes} likes</span>
        </div>
      ))}
    </div>
  );
}

export async function renderDashboard({ userId }: { userId: string }) {
  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-neutral-100">Dashboard</h3>

      <Suspense fallback={<UserCardSkeleton />}>
        <UserCard userId={userId} />
      </Suspense>

      <Suspense fallback={<PostsSkeleton />}>
        <UserPosts userId={userId} />
      </Suspense>
    </div>
  );
}
