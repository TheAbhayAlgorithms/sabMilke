import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requirePlatformAdmin } from "@/server/auth/guards";

export default async function AdminPage() {
  const session = await getCurrentSession();
  requirePlatformAdmin(session);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-2xl border border-purple-200 bg-purple-50 p-6">
        <h1 className="text-xl font-bold text-purple-950">Platform Admin Console</h1>
        <p className="mt-1 text-sm text-purple-800">
          Welcome, {session?.name}! Central control plane for societies, cycles, quotes, purchase orders, and audit logs.
        </p>
      </div>
    </div>
  );
}
