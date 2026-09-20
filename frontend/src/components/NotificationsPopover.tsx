"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Bell,
  CheckCircle,
  EnvelopeSimple,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import apiClient from "@/lib/api";
import type { AppNotification, PagedResult } from "@/types";
import { useRouter } from "next/navigation";

export default function NotificationsPopover() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get<PagedResult<AppNotification>>("/notifications", {
        params: {
          unreadOnly: unreadOnly ? true : undefined,
          limit: 20,
        },
      });
      setNotifications(res.data.items || []);
    } catch {
      // Gracefully handle network error
    } finally {
      setLoading(false);
    }
  }, [unreadOnly]);

  // Initial load and periodic polling every 45s
  useEffect(() => {
    fetchNotifications();

    const interval = setInterval(() => {
      fetchNotifications();
    }, 45000);

    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Listen for open-notifications event (from mobile dock or elsewhere)
  useEffect(() => {
    const handleOpen = () => {
      setIsOpen(true);
      fetchNotifications();
    };
    window.addEventListener("open-notifications", handleOpen);
    return () => window.removeEventListener("open-notifications", handleOpen);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Broadcast unread count to other listeners (like mobile floating dock)
  useEffect(() => {
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("notifications-count", { detail: unreadCount })
      );
    }
  }, [unreadCount]);

  const markAsRead = (id: string, e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true, readAtUtc: new Date().toISOString() } : n))
    );
    apiClient.post(`/notifications/${id}/read`).catch(() => {});
  };

  const markAllAsRead = (e?: React.MouseEvent | React.TouchEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const unread = notifications.filter((n) => !n.isRead);
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAtUtc: new Date().toISOString() }))
    );
    Promise.all(
      unread.map((n) => apiClient.post(`/notifications/${n.id}/read`).catch(() => {}))
    ).catch(() => {});
  };

  const handleNotificationClick = (notif: AppNotification) => {
    if (!notif.isRead) {
      markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.letterId) {
      router.push(`/dashboard?letterId=${notif.letterId}`);
    }
  };

  const formatTimestamp = (utcStr: string) => {
    const d = new Date(utcStr);
    const diffMs = Date.now() - d.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "LETTER_IN_TRANSIT":
        return <PaperPlaneTilt size={14} weight="bold" className="text-[#ff5a1f]" />;
      case "LETTER_DELIVERED":
        return <CheckCircle size={14} weight="bold" className="text-emerald-600" />;
      default:
        return <EnvelopeSimple size={14} weight="bold" className="text-[#6a6a64]" />;
    }
  };

  return (
    <div className="relative" ref={popoverRef}>
      {/* Desktop Bell Trigger Button (hidden on mobile; mobile dock handles Alerts) */}
      <button
        type="button"
        onClick={() => {
          const next = !isOpen;
          setIsOpen(next);
          if (next) fetchNotifications();
        }}
        className="hidden md:flex relative w-8 h-8 rounded-full border border-[#e5e5e0] hover:border-[#151515] active:bg-[#e5e5e0] items-center justify-center text-[#151515] hover:bg-[#f0f0ea] transition-all cursor-pointer shrink-0 select-none touch-manipulation"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={16} weight={unreadCount > 0 ? "fill" : "bold"} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 rounded-full bg-[#ff5a1f] ring-2 ring-[#ffffff]" />
        )}
      </button>

      {/* Popover / Mobile Bottom Drawer */}
      {isOpen && (
        <>
          {/* Mobile Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-[#151515]/40 backdrop-blur-xs z-[998] sm:hidden"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer container: Bottom sheet on mobile, anchored popover on desktop */}
          <div
            className="fixed inset-x-0 bottom-0 z-[999] sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:mt-2 w-full sm:w-96 max-h-[80vh] sm:max-h-[480px] bg-[#ffffff] border-t sm:border border-[#151515] rounded-t-3xl sm:rounded-2xl shadow-2xl sm:shadow-[8px_12px_0_rgba(20,20,20,0.12)] overflow-hidden flex flex-col animate-fadeIn"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Drag Handle Indicator */}
            <div className="w-12 h-1 rounded-full bg-[#d0d0c8] mx-auto mt-3 mb-1 sm:hidden shrink-0" />

            {/* Header */}
            <div className="px-4 py-3.5 border-b border-[#e5e5e0] flex items-center justify-between bg-[#fafaf9] shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-[#151515]">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded bg-[#fff0ed] text-[#ff5a1f] font-mono text-[10px] font-bold">
                    {unreadCount} new
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button
                    type="button"
                    onClick={markAllAsRead}
                    className="font-mono text-xs text-[#6a6a64] hover:text-[#151515] active:text-[#ff5a1f] py-1 px-1.5 transition-colors cursor-pointer touch-manipulation"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-[#6a6a64] hover:text-[#151515] active:bg-[#e5e5e0] rounded-lg transition-colors cursor-pointer touch-manipulation"
                  aria-label="Close"
                >
                  <X size={16} weight="bold" />
                </button>
              </div>
            </div>

            {/* Filter Pills */}
            <div className="px-4 py-2.5 border-b border-[#e5e5e0] flex items-center gap-2 bg-[#ffffff] shrink-0">
              <button
                type="button"
                onClick={() => setUnreadOnly(false)}
                className={`px-3 py-1 rounded-full font-mono text-xs transition-colors cursor-pointer touch-manipulation ${
                  !unreadOnly
                    ? "bg-[#151515] text-[#ffffff]"
                    : "bg-[#f0f0ea] text-[#6a6a64] hover:text-[#151515]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setUnreadOnly(true)}
                className={`px-3 py-1 rounded-full font-mono text-xs transition-colors cursor-pointer touch-manipulation ${
                  unreadOnly
                    ? "bg-[#151515] text-[#ffffff]"
                    : "bg-[#f0f0ea] text-[#6a6a64] hover:text-[#151515]"
                }`}
              >
                Unread
              </button>
            </div>

            {/* Notifications Scrollable List */}
            <div className="overflow-y-auto flex-1 divide-y divide-[#f0f0ea] overscroll-contain pb-safe">
              {loading && notifications.length === 0 ? (
                <div className="py-12 text-center font-mono text-xs text-[#6a6a64]">
                  Checking alerts...
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-12 text-center px-4">
                  <p className="font-medium text-xs text-[#6a6a64]">
                    {unreadOnly ? "No unread alerts" : "Your mailbox is quiet"}
                  </p>
                  <p className="font-mono text-[11px] text-[#9e9e97] mt-1">
                    Updates on sent and arriving mail will appear here.
                  </p>
                </div>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`px-4 py-3.5 active:bg-[#f0f0ea] hover:bg-[#fafaf9] transition-colors cursor-pointer flex items-start gap-3 text-left touch-manipulation ${
                      !notif.isRead ? "bg-[#fffdfb]" : ""
                    }`}
                  >
                    <div className="w-8 h-8 rounded-xl border border-[#e5e5e0] bg-[#ffffff] flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
                      {getIcon(notif.type)}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={`text-xs truncate ${
                            !notif.isRead ? "font-semibold text-[#151515]" : "font-medium text-[#6a6a64]"
                          }`}
                        >
                          {notif.title}
                        </p>
                        <span className="font-mono text-[10px] text-[#9e9e97] shrink-0">
                          {formatTimestamp(notif.createdAtUtc)}
                        </span>
                      </div>

                      <p className="text-xs text-[#6a6a64] mt-0.5 line-clamp-2 leading-relaxed">
                        {notif.body}
                      </p>
                    </div>

                    {!notif.isRead && (
                      <button
                        type="button"
                        onClick={(e) => markAsRead(notif.id, e)}
                        className="p-2 -mr-1 text-[#b0b0a8] hover:text-[#ff5a1f] active:text-[#ff5a1f] shrink-0 cursor-pointer touch-manipulation"
                        title="Mark as read"
                      >
                        <span className="w-2.5 h-2.5 rounded-full bg-[#ff5a1f] block" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
