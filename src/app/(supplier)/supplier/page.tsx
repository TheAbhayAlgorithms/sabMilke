import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireSupplier } from "@/server/auth/guards";

export default async function SupplierPage() {
  const session = await getCurrentSession();
  requireSupplier(session);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6">
        <h1 className="text-xl font-bold text-blue-950">Wholesale Supplier Portal</h1>
        <p className="mt-1 text-sm text-blue-800">
          Welcome, {session?.name}! Manage your price slabs, quotes, and incoming purchase orders.
        </p>
      </div>
    </div>
  );
}
