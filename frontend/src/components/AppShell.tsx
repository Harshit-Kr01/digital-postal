"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  Bell,
  EnvelopeSimple,
  PaperPlaneTilt,
  SignOut,
  SlidersHorizontal,
  Tray,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";
import NotificationsPopover from "@/components/NotificationsPopover";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const handleCount = (e: Event) => {
      const custom = e as CustomEvent<number>;
      setUnreadCount(custom.detail || 0);
    };
    window.addEventListener("notifications-count", handleCount);
    return () => window.removeEventListener("notifications-count", handleCount);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#ffffff] flex items-center justify-center">
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-[0.12em] text-[#6a6a64]">
          <span className="status-dot animate-pulse" />
          <span>opening mailbox...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }

  const navLinks = [
    { href: "/dashboard", label: "Overview" },
    { href: "/compose", label: "Write a letter" },
    { href: "/settings", label: "Settings" },
  ];

  return (
    <div className="stampy-app min-h-screen flex flex-col bg-[#ffffff] text-[#151515]">
      {/* Site Header matching stampy design language */}
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/dashboard" className="wordmark">
            digital postal<span>.</span>
          </Link>

          {/* Navigation with Stampy pill buttons (Desktop) */}
          <nav className="site-nav hidden md:flex">
            {navLinks.map(({ href, label }) => {
              const isActive = pathname === href;
              return (
                <Link
                  key={href}
                  href={href}
                  className={`header-action-btn ${
                    isActive ? "!bg-[#151515] !text-[#ffffff] !border-[#151515]" : ""
                  }`}
                >
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* User profile & Notifications & Sign out */}
          <div className="flex items-center gap-3 ml-4">
            <div className="hidden sm:flex items-center gap-2 pl-3 border-l border-[#e5e5e0]">
              <span className="status-dot" />
              <div className="leading-tight">
                <span className="block text-xs font-semibold text-[#151515]">
                  {user.displayName}
                </span>
                <span className="font-mono text-[10px] text-[#6a6a64] uppercase tracking-wider">
                  @{user.username}
                </span>
              </div>
            </div>

            <NotificationsPopover />

            <button
              type="button"
              className="header-action-btn"
              onClick={() => {
                logout();
                router.push("/");
              }}
              title="Sign out"
            >
              <SignOut size={13} weight="bold" />
              <span className="hidden md:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="studio-main flex-1 flex flex-col">
        {children}
      </main>

      {/* Studio Footer */}
      <footer className="studio-footer w-full max-w-[1440px] mx-auto px-6 sm:px-12 md:px-20 pb-8">
        <span>DIGITAL POSTAL / 2026</span>
        <span>LETTERS, WITH TIME IN THEM.</span>
      </footer>

      {/* Revamped Borderless Mobile Floating Navigation Dock */}
      <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[800] md:hidden w-auto max-w-[calc(100vw-32px)] pointer-events-auto" aria-label="Mobile Navigation">
        <nav className="flex items-center gap-1 sm:gap-2 px-2.5 py-1.5 bg-[#ffffff]/92 backdrop-blur-xl border border-[#e5e5e0] rounded-full shadow-[0_12px_32px_-4px_rgba(21,21,21,0.14),0_2px_8px_rgba(21,21,21,0.04)]">
          {/* Mailbox / Overview */}
          <Link
            href="/dashboard"
            className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] rounded-full transition-all select-none touch-manipulation ${
              pathname === "/dashboard"
                ? "text-[#151515] font-semibold"
                : "text-[#8e8e86] hover:text-[#151515] active:scale-95"
            }`}
            aria-label="Mailbox"
          >
            <Tray size={20} weight={pathname === "/dashboard" ? "fill" : "bold"} />
            <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5">Mailbox</span>
          </Link>

          {/* Write / Compose */}
          <Link
            href="/compose"
            className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] rounded-full transition-all select-none touch-manipulation ${
              pathname === "/compose"
                ? "text-[#ff5a1f] font-semibold"
                : "text-[#8e8e86] hover:text-[#151515] active:scale-95"
            }`}
            aria-label="Write a letter"
          >
            <PaperPlaneTilt size={20} weight={pathname === "/compose" ? "fill" : "bold"} />
            <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5">Write</span>
          </Link>

          {/* Alerts / Notifications Trigger */}
          <button
            type="button"
            onClick={() => {
              if (typeof window !== "undefined") {
                window.dispatchEvent(new CustomEvent("open-notifications"));
              }
            }}
            className="flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] rounded-full transition-all select-none touch-manipulation relative text-[#8e8e86] hover:text-[#151515] active:scale-95 cursor-pointer"
            aria-label="Alerts"
          >
            <div className="relative">
              <Bell size={20} weight={unreadCount > 0 ? "fill" : "bold"} />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#ff5a1f] ring-2 ring-[#ffffff]" />
              )}
            </div>
            <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5">Alerts</span>
          </button>

          {/* Settings */}
          <Link
            href="/settings"
            className={`flex flex-col items-center justify-center py-1.5 px-3 min-w-[56px] rounded-full transition-all select-none touch-manipulation ${
              pathname === "/settings"
                ? "text-[#151515] font-semibold"
                : "text-[#8e8e86] hover:text-[#151515] active:scale-95"
            }`}
            aria-label="Settings"
          >
            <SlidersHorizontal size={20} weight={pathname === "/settings" ? "fill" : "bold"} />
            <span className="font-mono text-[9px] uppercase tracking-wider mt-0.5">Settings</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
