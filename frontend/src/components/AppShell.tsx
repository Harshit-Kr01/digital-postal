"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  EnvelopeSimple,
  PaperPlaneTilt,
  SignOut,
  SlidersHorizontal,
  Tray,
} from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();

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

          {/* User profile & Sign out */}
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

      {/* Mobile Floating Navigation Dock (Stampy Design Language) */}
      <div className="mobile-dock-wrapper" aria-label="Mobile Navigation">
        <nav className="apple-dock">
          <Link
            href="/dashboard"
            className={`dock-btn dock-btn-secondary ${
              pathname === "/dashboard" ? "is-active" : ""
            }`}
            aria-label="Overview"
          >
            <Tray size={16} weight={pathname === "/dashboard" ? "fill" : "bold"} />
            <span>Overview</span>
          </Link>

          <Link
            href="/compose"
            className={`dock-btn dock-btn-primary ${
              pathname === "/compose" ? "is-active" : ""
            }`}
            aria-label="Write a letter"
          >
            <PaperPlaneTilt size={16} weight={pathname === "/compose" ? "fill" : "bold"} />
            <span>Write</span>
          </Link>

          <Link
            href="/settings"
            className={`dock-btn dock-btn-secondary ${
              pathname === "/settings" ? "is-active" : ""
            }`}
            aria-label="Settings"
          >
            <SlidersHorizontal size={16} weight={pathname === "/settings" ? "fill" : "bold"} />
            <span>Settings</span>
          </Link>
        </nav>
      </div>
    </div>
  );
}
