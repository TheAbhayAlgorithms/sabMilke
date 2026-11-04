import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireRole } from "@/server/auth/guards";
import { Role } from "@prisma/client";

export default async function SocietyAdminPage() {
  const session = await getCurrentSession();
  requireRole(session, [Role.SOCIETY_ADMIN, Role.PLATFORM_ADMIN]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <h1 className="text-xl font-bold text-amber-950">Society Admin (RWA Committee) Dashboard</h1>
        <p className="mt-1 text-sm text-amber-800">
          Welcome, {session?.name}! Read-only society metrics, resident participation, savings, and rebate reports.
        </p>
      </div>
    </div>
  );
}

