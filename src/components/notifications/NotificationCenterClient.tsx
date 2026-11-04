"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Bell,
  CheckCheck,
  Clock,
  Sparkles,
  Truck,
  CheckCircle2,
  LifeBuoy,
  MessageSquare,
  Smartphone,
  ChevronRight,
} from "lucide-react";

interface NotificationItem {
  id: string;
  channel: "IN_APP" | "WHATSAPP" | "SMS";
  title: string;
  body: string;
  data?: any;
  isRead: boolean;
  sentAt: string;
}

interface NotificationCenterClientProps {
  initialNotifications: NotificationItem[];
}

export function NotificationCenterClient({
  initialNotifications,
}: NotificationCenterClientProps) {
  const [notifications, setNotifications] = useState<NotificationItem[]>(
    initialNotifications
  );
  const [activeTab, setActiveTab] = useState<"all" | "unread">("all");
  const [isMarkingAll, setIsMarkingAll] = useState(false);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications =
    activeTab === "unread"
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  async function handleMarkAsRead(id: string) {
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );

    try {
      await fetch(`/api/notifications/${id}/read`, { method: "POST" });
    } catch (err) {
      console.error("Failed to mark notification read", err);
    }
  }

  async function handleMarkAllAsRead() {
    setIsMarkingAll(true);
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));

    try {
      await fetch("/api/notifications/mark-all-read", { method: "POST" });
    } catch (err) {
      console.error("Failed to mark all notifications read", err);
    } finally {
      setIsMarkingAll(false);
    }
  }

  function getTriggerIcon(title: string, data?: any) {
    const trigger = data?.trigger || "";
    if (trigger.includes("TIER_UNLOCKED") || title.includes("Tier")) {
      return <Sparkles className="h-5 w-5 text-amber-500" />;
    }
    if (trigger.includes("PAYMENT") || title.includes("Payment")) {
      return <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
    }
    if (trigger.includes("GOODS") || trigger.includes("READY") || title.includes("Truck") || title.includes("Pickup")) {
      return <Truck className="h-5 w-5 text-blue-600" />;
    }
    if (trigger.includes("ISSUE") || trigger.includes("TICKET") || title.includes("Ticket")) {
      return <LifeBuoy className="h-5 w-5 text-purple-600" />;
    }
    return <Clock className="h-5 w-5 text-brand-600" />;
  }

  function getChannelBadge(channel: string) {
    switch (channel) {
      case "WHATSAPP":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200">
            <MessageSquare className="h-3 w-3" /> WhatsApp
          </span>
        );
      case "SMS":
        return (
          <span className="inline-flex items-center gap-1 rounded bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 border border-sky-200">
            <Smartphone className="h-3 w-3" /> SMS
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 border border-purple-200">
            <Bell className="h-3 w-3" /> In-App
          </span>
        );
    }
  }

  function formatRelativeTime(dateString: string) {
    const d = new Date(dateString);
    const now = new Date();
    const diffHours = Math.round((now.getTime() - d.getTime()) / (1000 * 3600));
    if (diffHours < 1) return "Just now";
    if (diffHours === 1) return "1 hour ago";
    if (diffHours < 24) return `${diffHours} hours ago`;
    const diffDays = Math.round(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    return `${diffDays} days ago`;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-100 text-brand-700">
            <Bell className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Notifications</h1>
            <p className="text-xs text-gray-500">
              Updates on pool deadlines, unlocked tiers, deliveries & refunds
            </p>
          </div>
        </div>

        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            disabled={isMarkingAll}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-700 hover:text-brand-800 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg transition-colors"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 mb-4">
        <button
          onClick={() => setActiveTab("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "all"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setActiveTab("unread")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors ${
            activeTab === "unread"
              ? "bg-brand-600 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          Unread {unreadCount > 0 ? `(${unreadCount})` : ""}
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 p-10 text-center bg-gray-50/50">
          <Bell className="mx-auto h-8 w-8 text-gray-400 mb-2" />
          <p className="text-sm font-semibold text-gray-700">No notifications to show</p>
          <p className="text-xs text-gray-500 mt-1">
            {activeTab === "unread"
              ? "You're all caught up! No unread updates."
              : "Notifications on orders, tier drops, and deliveries will appear here."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((n) => (
            <div
              key={n.id}
              onClick={() => !n.isRead && handleMarkAsRead(n.id)}
              className={`rounded-xl border p-4 transition-all cursor-pointer ${
                n.isRead
                  ? "bg-white border-gray-200 opacity-90 hover:border-gray-300"
                  : "bg-amber-50/40 border-amber-300/80 shadow-xs hover:border-amber-400"
              }`}
            >
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100">
                  {getTriggerIcon(n.title, n.data)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3
                      className={`text-sm leading-snug line-clamp-1 ${
                        n.isRead ? "font-semibold text-gray-800" : "font-extrabold text-gray-900"
                      }`}
                    >
                      {n.title}
                    </h3>
                    <div className="flex items-center gap-2 shrink-0">
                      {getChannelBadge(n.channel)}
                      {!n.isRead && (
                        <span className="h-2 w-2 rounded-full bg-brand-600" title="Unread" />
                      )}
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {n.body}
                  </p>

                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-gray-400">
                    <span>{formatRelativeTime(n.sentAt)}</span>

                    {/* Contextual links if order or ticket is attached */}
                    {n.data?.orderId && (
                      <Link
                        href={`/orders/${n.data.orderId}`}
                        className="inline-flex items-center gap-0.5 font-bold text-brand-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Order <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                    {n.data?.ticketId && (
                      <Link
                        href={`/tickets/${n.data.ticketId}`}
                        className="inline-flex items-center gap-0.5 font-bold text-brand-700 hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        View Ticket <ChevronRight className="h-3 w-3" />
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
