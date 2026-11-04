"use client";

import React, { useState } from "react";
import Link from "next/link";
import { formatINR } from "@/lib/money";
import {
  ArrowLeft,
  LifeBuoy,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  MessageSquare,
  ShieldCheck,
  Package,
  Calendar,
} from "lucide-react";

interface TicketDetailClientProps {
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
    order: {
      id: string;
      pickupCode: string;
      status: string;
      totalGuaranteedPaise: number;
      society?: { name: string };
      items: {
        id: string;
        quantity: number;
        sku: { name: string; variantName: string; mrpPaise: number };
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
  currentUserId: string;
}

export function TicketDetailClient({ ticket, currentUserId }: TicketDetailClientProps) {
  const [messages, setMessages] = useState(ticket.messages);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  async function handleSendMessage(e: React.FormEvent) {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: newMessage.trim() }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages([...messages, data.message]);
        setNewMessage("");
      }
    } catch (err) {
      console.error("Failed to send message", err);
    } finally {
      setIsSending(false);
    }
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "RESOLVED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
            <CheckCircle2 className="h-3.5 w-3.5" /> Resolved
          </span>
        );
      case "ACKNOWLEDGED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-xs font-bold text-blue-800">
            <ShieldCheck className="h-3.5 w-3.5" /> Acknowledged (Under Review)
          </span>
        );
      case "REJECTED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-3 py-1 text-xs font-bold text-gray-800">
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            <Clock className="h-3.5 w-3.5" /> Open (Pending 48h SLA)
          </span>
        );
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 space-y-4">
      <Link
        href="/tickets"
        className="inline-flex items-center gap-1 text-xs font-semibold text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="h-4 w-4" />
        All Support Tickets
      </Link>

      {/* Ticket Header Card */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <div className="flex items-start justify-between gap-3 mb-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="rounded bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-700 uppercase">
                {ticket.category.replace("_", " ")}
              </span>
              <span className="text-xs text-gray-400">
                Ticket #{ticket.id.slice(-6).toUpperCase()}
              </span>
            </div>
            <h1 className="text-base font-bold text-gray-900 leading-snug">
              {ticket.subject}
            </h1>
          </div>
          <div>{getStatusBadge(ticket.status)}</div>
        </div>

        {/* SLA Status Banner */}
        <div className="rounded-xl border p-3.5 text-xs mb-4 bg-gray-50/70 border-gray-200">
          {ticket.status === "OPEN" && (
            <div className="flex items-start gap-2 text-amber-800">
              <Clock className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">48-Hour SLA Acknowledgement Window:</span>
                <p className="mt-0.5 text-gray-600">
                  {ticket.sla.isAcknowledgementBreached
                    ? "Escalated: 48-hour response target reached. Platform Grievance Officer has been notified."
                    : `Our grievance desk will formally acknowledge within ${ticket.sla.acknowledgementRemainingHours} hours.`}
                </p>
              </div>
            </div>
          )}

          {ticket.status === "ACKNOWLEDGED" && (
            <div className="flex items-start gap-2 text-blue-900">
              <ShieldCheck className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Formally Acknowledged by Grievance Officer:</span>
                <p className="mt-0.5 text-gray-600">
                  {ticket.acknowledgedAt && `Acknowledged on ${new Date(ticket.acknowledgedAt).toLocaleString("en-IN")}. `}
                  Resolution in progress (statutory target within {ticket.sla.resolutionRemainingDays} days).
                </p>
              </div>
            </div>
          )}

          {ticket.status === "RESOLVED" && (
            <div className="flex items-start gap-2 text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Issue Resolved:</span>
                <p className="mt-0.5 text-gray-700">
                  {ticket.resolutionNotes || "Issue has been resolved and any approved refund credited to your wallet."}
                </p>
              </div>
            </div>
          )}

          {ticket.status === "REJECTED" && (
            <div className="flex items-start gap-2 text-gray-800">
              <AlertCircle className="h-4 w-4 text-gray-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Ticket Closed:</span>
                <p className="mt-0.5 text-gray-600">{ticket.resolutionNotes}</p>
              </div>
            </div>
          )}
        </div>

        {/* Issue Description */}
        <div className="text-xs text-gray-700 space-y-2 mb-4">
          <p className="font-medium text-gray-900">Description:</p>
          <p className="rounded-xl bg-gray-50 p-3 leading-relaxed border border-gray-100">
            {ticket.description}
          </p>
        </div>

        {/* Photo Gallery */}
        {ticket.photoUrls.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-semibold text-gray-700 mb-2">Attached Photos:</p>
            <div className="grid grid-cols-2 gap-2">
              {ticket.photoUrls.map((url, idx) => (
                <a
                  key={idx}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg overflow-hidden border border-gray-200 block hover:opacity-90 transition-opacity"
                >
                  <img
                    src={url}
                    alt={`Attachment ${idx + 1}`}
                    className="h-32 w-full object-cover"
                  />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Order Details Accordion / Summary */}
        <div className="rounded-xl border border-gray-200 p-3 text-xs bg-gray-50/50 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-gray-500" />
            <div>
              <span className="font-semibold text-gray-800">
                Order #{ticket.order.pickupCode}
              </span>
              <span className="text-gray-500 ml-1">
                ({ticket.order.society?.name})
              </span>
            </div>
          </div>
          <Link
            href={`/orders/${ticket.order.id}`}
            className="text-brand-700 font-bold hover:underline"
          >
            View Order
          </Link>
        </div>
      </div>

      {/* Messages / Conversation Thread */}
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-bold text-gray-900 mb-3 flex items-center gap-2">
          <MessageSquare className="h-4 w-4 text-brand-600" />
          Messages & Updates ({messages.length})
        </h2>

        <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
          {messages.length === 0 ? (
            <p className="text-xs text-gray-400 text-center py-4">
              No replies yet. Our grievance officer will review and reply here.
            </p>
          ) : (
            messages.map((m) => {
              const isMe = m.sender.id === currentUserId;
              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${
                    isMe ? "items-end" : "items-start"
                  }`}
                >
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400 mb-1">
                    <span className="font-bold text-gray-700">
                      {isMe ? "You" : m.sender.name}
                    </span>
                    {!isMe && (
                      <span className="rounded bg-brand-50 px-1 py-0.2 text-brand-700 font-semibold">
                        {m.sender.role}
                      </span>
                    )}
                    <span>• {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div
                    className={`rounded-2xl px-3.5 py-2 text-xs max-w-[85%] ${
                      isMe
                        ? "bg-brand-600 text-white rounded-br-xs"
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

        {/* Message Input */}
        {ticket.status !== "RESOLVED" && ticket.status !== "REJECTED" && (
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type your message or query..."
              className="flex-1 rounded-xl border border-gray-300 p-2.5 text-xs text-gray-800 focus:border-brand-500 focus:outline-hidden"
            />
            <button
              type="submit"
              disabled={isSending || !newMessage.trim()}
              className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-4 text-xs font-bold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

