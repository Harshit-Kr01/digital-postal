"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { EnvelopeSimple, SignOut, UserCircle } from "@phosphor-icons/react";
import { useAuth } from "@/context/AuthContext";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, logout } = useAuth();
  if (isLoading)
    return (
      <div className="editorial-shell flex items-center justify-center">
        <span className="eyebrow">opening mailbox</span>
      </div>
    );
  if (!user) {
    if (typeof window !== "undefined") router.replace("/login");
    return null;
  }
  const nav = [
    ["/dashboard", "Overview"],
    ["/compose", "Write a letter"],
    ["/settings", "Settings"],
  ];
  return (
    <div className="editorial-shell">
      <header className="border-b editorial-rule px-5 py-5 md:px-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 text-sm font-bold"
          >
            <EnvelopeSimple size={20} weight="bold" /> digital postal
          </Link>
          <div className="flex items-center gap-5">
            <div className="hidden text-right sm:block">
              <p className="text-xs font-bold">{user.displayName}</p>
              <p className="text-[10px] text-[#6d6d6d]">@{user.username}</p>
            </div>
            <UserCircle size={24} />
            <button
              aria-label="Sign out"
              onClick={() => {
                logout();
                router.push("/");
              }}
            >
              <SignOut size={18} />
            </button>
          </div>
        </div>
      </header>
      <nav className="border-b editorial-rule px-5 md:px-10">
        <div className="mx-auto flex max-w-7xl gap-7">
          {nav.map(([href, label]) => (
            <Link
              key={href}
              href={href}
              className={`border-b-2 py-4 text-xs font-bold ${pathname === href ? "border-[#5d43bb]" : "border-transparent text-[#6d6d6d]"}`}
            >
              {label}
            </Link>
          ))}
          <span className="ml-auto py-4 text-[10px] font-bold uppercase tracking-[.12em] text-[#aaa]">
            mailbox / beta
          </span>
        </div>
      </nav>
      <main className="mx-auto max-w-7xl px-5 py-12 md:px-10">{children}</main>
    </div>
  );
}
