"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import {
  ArrowLeft,
  LifeBuoy,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Send,
  IndianRupee,
  Package,
  User,
  ExternalLink,
  X,
} from "lucide-react";

interface AdminTicketDetailClientProps {
  ticket: {
    id: string;
    category: string;
    subject: string;
    description: string;
    photoUrls: string[];
    status: string;
    createdAt: string;
    acknowledgedAt?: string | null;
    resolvedAt?: string | null;
    resolutionNotes?: string | null;
    sla: {
      isAcknowledged: boolean;
      acknowledgementRemainingHours: number;
      isAcknowledgementBreached: boolean;
      resolutionRemainingDays: number;
      isResolutionBreached: boolean;
      isResolved: boolean;
    };
    user: {
      id: string;
      name: string | null;
      phone: string;
    };
    order: {
      id: string;
      pickupCode: string;
      status: string;
      totalGuaranteedPaise: number;
      society?: { name: string };
      items: {
        id: string;
        quantity: number;
        sku: { id: string; name: string; variantName: string; mrpPaise: number };
      }[];
    };
    messages: {
      id: string;
      message: string;
      createdAt: string;
      sender: {
        id: string;
        name: string;
        role: string;
      };
    }[];
  };
}

export function AdminTicketDetailClient({ ticket }: AdminTicketDetailClientProps) {
  const [currentTicket, setCurrentTicket] = useState(ticket);
  const [messages, setMessages] = useState(ticket.messages);
  const [replyText, setReplyText] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  // SLA Acknowledge action
  const [isAcknowledging, setIsAcknowledging] = useState(false);

  // Resolve modal state
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState("");
  const [refundRupees, setRefundRupees] = useState("");
  const [isResolving, setIsResolving] = useState(false);

  // Reject modal state
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);

  const [actionError, setActionError] = useState("");

  async function handleAcknowledge() {
    setIsAcknowledging(true);
    setActionError("");
    try {
      const res = await fetch(`/api/tickets/${currentTicket.id}/acknowledge`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to acknowledge ticket.");

      setCurrentTicket((prev) => ({
        ...prev,
        status: "ACKNOWLEDGED",
        acknowledgedAt: new Date().toISOString(),
        sla: { ...prev.sla, isAcknowledged: true },
      }));
    } catch (err: any) {
      setActionError(err.message || "Failed to acknowledge");
    } finally {
      setIsAcknowledging(false);
    }
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    if (!resolutionNotes.trim()) return;

    setIsResolving(true);
    setActionError("");

    const parsedPaise = refundRupees ? Math.round(Number(refundRupees) * 100) : 0;

    try {
      const res = await fetch(`/api/tickets/${currentTicket.id}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resolutionNotes: resolutionNotes.trim(),
          refundAmountPaise: parsedPaise,
          refundReason: `Grievance Resolution: ${currentTicket.category}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to resolve ticket.");

      setCurrentTicket((prev) => ({
        ...prev,
        status: "RESOLVED",
        resolvedAt: new Date().toISOString(),
        resolutionNotes: resolutionNotes.trim(),
        sla: { ...prev.sla, isResolved: true },
      }));
      setShowResolveModal(false);
    } catch (err: any) {
      setActionError(err.message || "Failed to resolve ticket");
    } finally {
      setIsResolving(false);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    if (!rejectReason.trim()) return;

    setIsRejecting(true);
    setActionError("");
    try {
      const res = await fetch(`/api/tickets/${currentTicket.id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason.trim() }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to reject ticket.");

      setCurrentTicket((prev) => ({
        ...prev,
        status: "REJECTED",
        resolvedAt: new Date().toISOString(),
        resolutionNotes: rejectReason.trim(),
      }));
      setShowRejectModal(false);
    } catch (err: any) {
      setActionError(err.message || "Failed to reject ticket");
    } finally {
      setIsRejecting(false);
    }
  }

  async function handleSendReply(e: React.FormEvent) {
    e.preventDefault();
    if (!replyText.trim() || isSendingReply) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`/api/tickets/${currentTicket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: replyText.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        setReplyText("");
      }
    } catch (err) {
      console.error("Failed to send reply", err);
    } finally {
      setIsSendingReply(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">
      <Link
        href="/admin/tickets"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Grievance Console
      </Link>

      {/* Main Ticket Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-4 pb-4 border-b border-gray-100">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="rounded bg-purple-100 px-2 py-0.5 text-[10px] font-bold text-purple-800 uppercase">
                {currentTicket.category.replace("_", " ")}
              </span>
              <span className="text-xs font-mono text-gray-400">
                Ticket #{currentTicket.id.slice(-6).toUpperCase()}
              </span>
            </div>
            <h1 className="text-lg font-bold text-gray-900">
              {currentTicket.subject}
            </h1>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {currentTicket.status === "OPEN" && (
              <button
                onClick={handleAcknowledge}
                disabled={isAcknowledging}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors"
              >
                <ShieldCheck className="h-4 w-4" />
                {isAcknowledging ? "Acknowledging..." : "Acknowledge (Stop 48h SLA)"}
              </button>
            )}

            {currentTicket.status !== "RESOLVED" && currentTicket.status !== "REJECTED" && (
              <>
                <button
                  onClick={() => setShowResolveModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition-colors"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Resolve with Refund
                </button>

                <button
                  onClick={() => setShowRejectModal(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 hover:bg-gray-100 px-3 py-2 text-xs font-semibold text-gray-700 transition-colors"
                >
                  Reject
                </button>
              </>
            )}
          </div>
        </div>

        {actionError && (
          <div className="rounded-xl bg-red-50 border border-red-200 p-3 mb-4 text-xs text-red-700 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
            <span>{actionError}</span>
          </div>
        )}

        {/* SLA Status Alert */}
        <div className="rounded-xl border p-4 mb-4 bg-gray-50/70 border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {currentTicket.status === "OPEN" && (
                <Clock className="h-5 w-5 text-amber-600" />
              )}
              {currentTicket.status === "ACKNOWLEDGED" && (
                <ShieldCheck className="h-5 w-5 text-blue-600" />
              )}
              {currentTicket.status === "RESOLVED" && (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              )}
              <div>
                <span className="text-xs font-bold text-gray-900">
                  Status: {currentTicket.status}
                </span>
                <p className="text-xs text-gray-600">
                  {currentTicket.status === "OPEN" &&
                    (currentTicket.sla.isAcknowledgementBreached
                      ? "⚠️ 48-Hour Acknowledgement SLA Breached!"
                      : `Awaiting Grievance Officer formal acknowledgement (${currentTicket.sla.acknowledgementRemainingHours} hours remaining).`)}
                  {currentTicket.status === "ACKNOWLEDGED" &&
                    `Acknowledged on ${new Date(currentTicket.acknowledgedAt!).toLocaleString("en-IN")}. Resolution targeted within ${currentTicket.sla.resolutionRemainingDays} days.`}
                  {currentTicket.status === "RESOLVED" &&
                    `Resolved on ${new Date(currentTicket.resolvedAt!).toLocaleString("en-IN")}. Notes: ${currentTicket.resolutionNotes}`}
                  {currentTicket.status === "REJECTED" &&
                    `Rejected. Reason: ${currentTicket.resolutionNotes}`}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Description & Resident Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2 rounded-xl border border-gray-100 bg-gray-50/50 p-4">
            <p className="text-xs font-bold text-gray-800 mb-1">Issue Description:</p>
            <p className="text-xs text-gray-700 leading-relaxed whitespace-pre-wrap">
              {currentTicket.description}
            </p>

            {currentTicket.photoUrls.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-gray-800 mb-2">Attached Photographic Evidence:</p>
                <div className="grid grid-cols-2 gap-2">
                  {currentTicket.photoUrls.map((url, idx) => (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-lg overflow-hidden border border-gray-200 block hover:opacity-90 transition-opacity"
                    >
                      <img
                        src={url}
                        alt={`Evidence ${idx + 1}`}
                        className="h-32 w-full object-cover"
                      />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-gray-200 p-3.5 text-xs bg-white space-y-1.5">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <User className="h-4 w-4 text-purple-600" /> Resident Details
              </span>
              <p className="text-gray-800 font-medium">
                {currentTicket.user.name || "Resident"}
              </p>
              <p className="text-gray-500">{currentTicket.user.phone}</p>
            </div>

            <div className="rounded-xl border border-gray-200 p-3.5 text-xs bg-white space-y-1.5">
              <span className="font-bold text-gray-900 flex items-center gap-1.5">
                <Package className="h-4 w-4 text-purple-600" /> Order Info
              </span>
              <p className="text-gray-800 font-medium">
                Order #{currentTicket.order.pickupCode}
              </p>
              <p className="text-gray-500">
                Society: {currentTicket.order.society?.name || "Green Glen Heights"}
              </p>
              <Link
                href={`/orders/${currentTicket.order.id}`}
                className="inline-flex items-center gap-1 font-bold text-brand-700 hover:underline pt-1"
              >
                View Full Order Details <ExternalLink className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Messages Thread */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs">
        <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-purple-700" />
          Resident Communication Thread ({messages.length})
        </h2>

        <div className="space-y-3 mb-4 max-h-80 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              No replies yet. Send an update or explanation to the resident.
            </p>
          ) : (
            messages.map((m) => {
              const isAdmin = m.sender.role === "PLATFORM_ADMIN";
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    isAdmin ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1">
                    <span className="font-bold text-gray-700">
                      {isAdmin ? "Grievance Officer (You)" : m.sender.name}
                    </span>
                    <span>• {new Date(m.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2.5 text-xs max-w-[85%] ${
                      isAdmin
                        ? "bg-purple-700 text-white rounded-br-xs"
                        : "bg-gray-100 text-gray-800 rounded-bl-xs"
                    }`}
                  >
                    {m.message}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <form onSubmit={handleSendReply} className="flex gap-2">
          <input
            type="text"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Reply to resident..."
            className="flex-1 rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden"
          />
          <button
            type="submit"
            disabled={isSendingReply || !replyText.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-purple-700 hover:bg-purple-800 px-4 text-xs font-bold text-white transition-colors"
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </form>
      </div>

      {/* Resolve Modal */}
      {showResolveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                Resolve Ticket & Issue Refund
              </h3>
              <button
                onClick={() => setShowResolveModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleResolve} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Resolution Notes (Required)
                </label>
                <textarea
                  rows={3}
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="e.g. Broken seal verified against photo. Approved 100% refund for damaged unit to resident wallet."
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Refund Amount (₹) - Stored in Integer Paise
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-gray-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={refundRupees}
                    onChange={(e) => setRefundRupees(e.target.value)}
                    placeholder="e.g. 150"
                    className="w-full rounded-xl border border-gray-300 pl-7 pr-3 py-2 text-xs text-gray-800 font-semibold focus:border-brand-500 focus:outline-hidden"
                  />
                </div>
                <p className="text-[11px] text-gray-500 mt-1">
                  Will instantly credit the resident&apos;s SocietyBuy wallet and create an official GST credit note.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowResolveModal(false)}
                  className="rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResolving}
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-xs font-bold text-white transition-colors"
                >
                  {isResolving ? "Resolving..." : "Confirm & Resolve"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-base font-bold text-gray-900">
                Reject Grievance Ticket
              </h3>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleReject} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Rejection Reason (Required)
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this issue cannot be approved (e.g. outside 24h handover window)..."
                  className="w-full rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden"
                  required
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowRejectModal(false)}
                  className="rounded-xl border border-gray-300 px-3.5 py-2 text-xs font-semibold text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRejecting}
                  className="rounded-xl bg-red-600 hover:bg-red-700 px-4 py-2 text-xs font-bold text-white transition-colors"
                >
                  {isRejecting ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
