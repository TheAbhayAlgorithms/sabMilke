"use client";

import React, { useState } from "react";
import { formatINR } from "@/lib/money";
import Link from "next/link";
import { RefreshCw, Lock, AlertOctagon, CheckCircle2, Play, Plus, X, Eye } from "lucide-react";

interface CycleItem {
  id: string;
  name: string;
  status: string;
  opensAt: string;
  locksAt: string;
  deliveryTargetDate: string;
  minSocietyValuePaise: number;
  minHouseholds: number;
  society: {
    id: string;
    name: string;
  };
  ordersCount: number;
  totalPooledUnits: number;
  totalOrderValuePaise: number;
}

interface SocietyOption {
  id: string;
  name: string;
}

interface CycleManagerClientProps {
  initialCycles: CycleItem[];
  societies: SocietyOption[];
}

export function CycleManagerClient({ initialCycles, societies }: CycleManagerClientProps) {
  const [cycles, setCycles] = useState<CycleItem[]>(initialCycles);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // New Cycle form state
  const [formSocietyId, setFormSocietyId] = useState(societies[0]?.id || "");
  const [formName, setFormName] = useState("December 2026 Monthly Staples Pool");
  const [formOpensAt, setFormOpensAt] = useState(() => new Date().toISOString().split("T")[0]);
  const [formLocksAt, setFormLocksAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [formDeliversAt, setFormDeliversAt] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 10);
    return d.toISOString().split("T")[0];
  });

  const handleAction = async (cycleId: string, action: "open" | "lock" | "cancel") => {
    if (action === "cancel" && !confirm("Are you sure you want to cancel this cycle? All orders will be refunded.")) {
      return;
    }
    setActionLoading(`${cycleId}-${action}`);

    try {
      const res = await fetch(`/api/admin/cycles/${cycleId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Action initiated by Platform Admin" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || `Failed to ${action} cycle`);

      alert(`Cycle ${action}ed successfully!`);
      window.location.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : `Error on ${action}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading("create");

    try {
      const res = await fetch("/api/admin/cycles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          societyId: formSocietyId,
          name: formName,
          opensAt: new Date(formOpensAt).toISOString(),
          locksAt: new Date(formLocksAt).toISOString(),
          deliveryTargetDate: new Date(formDeliversAt).toISOString(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create cycle");

      setShowCreateModal(false);
      window.location.reload();
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Creation error");
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div>
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-purple-600" />
            Society Cycle Manager
          </h1>
          <p className="text-xs text-gray-500">
            Create, open, force-lock, or cancel monthly group-buying cycles.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-purple-700 px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-purple-800"
        >
          <Plus className="h-4 w-4" />
          Create New Cycle
        </button>
      </div>

      {/* Cycles Table */}
      <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-2xs">
        <table className="w-full text-left text-xs text-gray-600">
          <thead className="border-b border-gray-200 bg-gray-50 text-[11px] font-bold text-gray-700 uppercase">
            <tr>
              <th className="px-4 py-3">Society & Cycle</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Pooled Volume</th>
              <th className="px-4 py-3">Thresholds</th>
              <th className="px-4 py-3">Lock Deadline</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 font-medium">
            {cycles.map((c) => (
              <tr key={c.id} className="hover:bg-gray-50/50">
                <td className="px-4 py-3">
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded">
                    {c.society.name}
                  </span>
                  <div className="font-bold text-gray-900 mt-1">{c.name}</div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold border ${
                      c.status === "OPEN"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : c.status === "LOCKED"
                        ? "bg-blue-50 text-blue-700 border-blue-200"
                        : c.status === "CANCELLED"
                        ? "bg-red-50 text-red-700 border-red-200"
                        : "bg-gray-100 text-gray-700 border-gray-200"
                    }`}
                  >
                    {c.status}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-900">
                    {c.totalPooledUnits} units
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {c.ordersCount} orders • {formatINR(c.totalOrderValuePaise)}
                  </div>
                </td>
                <td className="px-4 py-3 text-gray-500 text-[11px]">
                  <div>Min: {formatINR(c.minSocietyValuePaise)}</div>
                  <div>Households: {c.minHouseholds} min</div>
                </td>
                <td className="px-4 py-3 text-[11px] text-gray-600">
                  <div>Locks: {new Date(c.locksAt).toLocaleDateString("en-IN")}</div>
                  <div className="text-gray-400">Delivers: {new Date(c.deliveryTargetDate).toLocaleDateString("en-IN")}</div>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="inline-flex items-center gap-1.5">
                    <Link
                      href={`/admin/cycles/${c.id}`}
                      className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-2.5 py-1 text-xs font-bold text-gray-700 hover:bg-purple-50 hover:text-purple-700"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      Live Pool
                    </Link>

                    {c.status === "DRAFT" && (
                      <button
                        type="button"
                        disabled={actionLoading === `${c.id}-open`}
                        onClick={() => handleAction(c.id, "open")}
                        className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        <Play className="h-3 w-3 inline mr-1" />
                        Open
                      </button>
                    )}

                    {c.status === "OPEN" && (
                      <>
                        <button
                          type="button"
                          disabled={actionLoading === `${c.id}-lock`}
                          onClick={() => handleAction(c.id, "lock")}
                          className="rounded-lg bg-blue-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-blue-700 disabled:opacity-50"
                          title="Force Lock: Compute final prices, refund deltas, and select winning quotes"
                        >
                          <Lock className="h-3 w-3 inline mr-1" />
                          Force Lock
                        </button>
                        <button
                          type="button"
                          disabled={actionLoading === `${c.id}-cancel`}
                          onClick={() => handleAction(c.id, "cancel")}
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                        >
                          <AlertOctagon className="h-3 w-3 inline mr-1" />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create Cycle Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-2xs">
          <form
            onSubmit={handleCreateCycle}
            className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-3 text-xs"
          >
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <h2 className="text-base font-bold text-gray-900">Create New Society Cycle</h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Target Housing Society</label>
              <select
                value={formSocietyId}
                onChange={(e) => setFormSocietyId(e.target.value)}
                className="w-full rounded-xl border border-gray-300 p-2 text-xs font-semibold"
                required
              >
                {societies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-1">Cycle Name</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="e.g. December 2026 Monthly Staples Pool"
                className="w-full rounded-xl border border-gray-300 p-2"
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block font-bold text-gray-700 mb-1">Opens On</label>
                <input
                  type="date"
                  value={formOpensAt}
                  onChange={(e) => setFormOpensAt(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Locks On</label>
                <input
                  type="date"
                  value={formLocksAt}
                  onChange={(e) => setFormLocksAt(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2"
                  required
                />
              </div>
              <div>
                <label className="block font-bold text-gray-700 mb-1">Delivers On</label>
                <input
                  type="date"
                  value={formDeliversAt}
                  onChange={(e) => setFormDeliversAt(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 p-2"
                  required
                />
              </div>
            </div>

            <p className="text-[11px] text-gray-500">
              Upon creation, the cycle starts in <strong>DRAFT</strong>. All 25 active catalogue SKUs will automatically be populated with initial guaranteed prices.
            </p>

            <div className="flex justify-end gap-2 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="rounded-xl px-4 py-2 font-semibold text-gray-600 hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading === "create"}
                className="rounded-xl bg-purple-700 px-4 py-2 font-bold text-white shadow-xs hover:bg-purple-800 disabled:opacity-50"
              >
                {actionLoading === "create" ? "Creating..." : "Create Cycle"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

