import React from "react";
import { getCurrentSession } from "@/server/auth/session";
import { requireRole } from "@/server/auth/guards";
import { Role } from "@prisma/client";

export default async function CaptainPage() {
  const session = await getCurrentSession();
  requireRole(session, [Role.CAPTAIN, Role.PLATFORM_ADMIN]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
        <h1 className="text-xl font-bold text-emerald-950">Volunteer Captain Hub</h1>
        <p className="mt-1 text-sm text-emerald-800">
          Welcome, {session?.name}! You are managing society distribution for {session?.memberships[0]?.societyName}.
        </p>
      </div>
    </div>
  );
}
