"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Bell,
  Check,
  CheckCircle,
  EnvelopeSimple,
  PaperPlaneTilt,
  WarningCircle,
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
      // Gracefully handle error
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

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await apiClient.post(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true, readAtUtc: new Date().toISOString() } : n))
      );
    } catch {
      // Ignored
    }
  };

  const markAllAsRead = async () => {
    const unread = notifications.filter((n) => !n.isRead);
    await Promise.all(
      unread.map((n) =>
        apiClient.post(`/notifications/${n.id}/read`).catch(() => {})
      )
    );
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, isRead: true, readAtUtc: new Date().toISOString() }))
    );
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    if (!notif.isRead) {
      await markAsRead(notif.id);
    }
    setIsOpen(false);
    if (notif.letterId) {
      router.push("/dashboard");
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
      {/* Bell Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) fetchNotifications();
        }}
        className="header-action-btn relative"
        aria-label="Notifications"
        title="Notifications"
      >
        <Bell size={14} weight={unreadCount > 0 ? "fill" : "bold"} />
        <span className="hidden md:inline">Alerts</span>

        {unreadCount > 0 && (
          <span className="inline-flex items-center justify-center px-1.5 py-0.2 min-w-4 h-4 rounded-full bg-[#ff5a1f] text-[#ffffff] font-mono text-[10px] font-bold">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-[#ffffff] border border-[#151515] rounded-2xl shadow-[8px_12px_0_rgba(20,20,20,0.12)] z-50 overflow-hidden flex flex-col max-h-[480px] animate-fadeIn">
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-[#e5e5e0] flex items-center justify-between bg-[#fafaf9]">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-[#151515]">Notifications</span>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 rounded bg-[#fff0ed] text-[#ff5a1f] font-mono text-[10px] font-bold">
                  {unreadCount} new
                </span>
              )}
            </div>

            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllAsRead}
                  className="font-mono text-[11px] text-[#6a6a64] hover:text-[#151515] transition-colors"
                >
                  Mark all read
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-[#6a6a64] hover:text-[#151515] rounded"
                aria-label="Close"
              >
                <X size={14} weight="bold" />
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="px-4 py-2 border-b border-[#e5e5e0] flex items-center gap-2 bg-[#ffffff]">
            <button
              type="button"
              onClick={() => setUnreadOnly(false)}
              className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] transition-colors ${
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
              className={`px-2.5 py-0.5 rounded-full font-mono text-[11px] transition-colors ${
                unreadOnly
                  ? "bg-[#151515] text-[#ffffff]"
                  : "bg-[#f0f0ea] text-[#6a6a64] hover:text-[#151515]"
              }`}
            >
              Unread
            </button>
          </div>

          {/* Notifications List */}
          <div className="overflow-y-auto flex-1 divide-y divide-[#f0f0ea]">
            {loading && notifications.length === 0 ? (
              <div className="py-8 text-center font-mono text-xs text-[#6a6a64]">
                Checking alerts...
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-10 text-center px-4">
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
                  className={`px-4 py-3 hover:bg-[#fafaf9] transition-colors cursor-pointer flex items-start gap-3 text-left ${
                    !notif.isRead ? "bg-[#fffdfb]" : ""
                  }`}
                >
                  <div className="w-7 h-7 rounded-lg border border-[#e5e5e0] bg-[#ffffff] flex items-center justify-center shrink-0 mt-0.5">
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
                      className="p-1 text-[#b0b0a8] hover:text-[#ff5a1f] shrink-0"
                      title="Mark as read"
                    >
                      <span className="w-2 h-2 rounded-full bg-[#ff5a1f] block" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
