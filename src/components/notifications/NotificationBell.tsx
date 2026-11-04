"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";

export function NotificationBell() {
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchUnread() {
      try {
        const res = await fetch("/api/notifications?unread=true");
        if (res.ok) {
          const data = await res.json();
          if (isMounted) {
            setUnreadCount(data.unreadCount || 0);
          }
        }
      } catch (err) {
        // Silently catch in header bell
      }
    }

    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <Link
      href="/notifications"
      className="relative flex items-center justify-center h-8 w-8 rounded-lg text-gray-600 hover:text-brand-700 hover:bg-gray-100 transition-colors"
      title="Notifications"
    >
      <Bell className="h-4 w-4" />
      {unreadCount > 0 && (
        <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-extrabold text-white">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Link>
  );
}
