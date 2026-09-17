"use client";

import React, { ChangeEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "@phosphor-icons/react";
import apiClient, { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { PostalLocation } from "@/types";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [locations, setLocations] = useState<PostalLocation[]>([]);

  const [form, setForm] = useState({
    usernameOrEmail: "",
    username: "",
    displayName: "",
    email: "",
    password: "",
    locationId: "",
  });

  useEffect(() => {
    if (mode === "register") {
      apiClient
        .get<PostalLocation[]>("/locations")
        .then((r) => setLocations(r.data))
        .catch((reason) => setError(getErrorMessage(reason)));
    }
  }, [mode]);

  const change =
    (key: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login") {
        await login({
          usernameOrEmail: form.usernameOrEmail,
          password: form.password,
        });
      } else {
        await register({
          username: form.username,
          displayName: form.displayName,
          email: form.email,
          password: form.password,
          locationId: form.locationId,
        });
      }
      router.push("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="stampy-app min-h-screen flex flex-col justify-between bg-[#ffffff] text-[#151515] px-6 py-8">
      {/* Top Header */}
      <header className="max-w-xl mx-auto w-full flex items-center justify-between">
        <Link href="/" className="wordmark">
          digital postal<span>.</span>
        </Link>

        <Link
          href="/"
          className="inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#6a6a64] hover:text-[#151515] transition-colors"
        >
          <ArrowLeft size={13} weight="bold" />
          <span>home</span>
        </Link>
      </header>

      {/* Centered Auth Card */}
      <main className="max-w-md mx-auto w-full my-12">
        <div className="border border-[#e5e5e0] bg-[#ffffff] p-8 sm:p-10 rounded-2xl shadow-[8px_10px_0_rgba(20,20,20,0.04)]">
          <p className="eyebrow">
            {mode === "login" ? "returning mail" : "new account"}
          </p>
          <h1 className="text-3xl sm:text-4xl font-medium tracking-tight mt-1 text-[#151515]">
            {mode === "login" ? "Welcome back." : "Open your mailbox."}
          </h1>
          <p className="mt-2 text-sm text-[#6a6a64] leading-relaxed">
            {mode === "login"
              ? "Your letters are waiting where you left them."
              : "Choose a home postal location. It will shape how your letters travel."}
          </p>

          <form onSubmit={submit} className="mt-8 flex flex-col gap-5">
            {mode === "login" ? (
              <>
                <label className="field-label">
                  <div className="field-label-header">
                    <span className="field-title">Username or Email</span>
                    <span className="field-sub">IDENTITY</span>
                  </div>
                  <input
                    type="text"
                    value={form.usernameOrEmail}
                    onChange={change("usernameOrEmail")}
                    placeholder="e.g. postal_writer or user@example.com"
                    required
                    autoComplete="username"
                  />
                </label>

                <label className="field-label">
                  <div className="field-label-header">
                    <span className="field-title">Password</span>
                    <span className="field-sub">KEY</span>
                  </div>
                  <input
                    type="password"
                    value={form.password}
                    onChange={change("password")}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                </label>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className="field-label">
                    <div className="field-label-header">
                      <span className="field-title">Full Name</span>
                      <span className="field-sub">NAME</span>
                    </div>
                    <input
                      type="text"
                      value={form.displayName}
                      onChange={change("displayName")}
                      placeholder="e.g. Eleanor Vance"
                      required
                    />
                  </label>

                  <label className="field-label">
                    <div className="field-label-header">
                      <span className="field-title">Username</span>
                      <span className="field-sub">HANDLE</span>
                    </div>
                    <input
                      type="text"
                      value={form.username}
                      onChange={change("username")}
                      placeholder="e.g. eleanor"
                      required
                    />
                  </label>
                </div>

                <label className="field-label">
                  <div className="field-label-header">
                    <span className="field-title">Email</span>
                    <span className="field-sub">CONTACT</span>
                  </div>
                  <input
                    type="email"
                    value={form.email}
                    onChange={change("email")}
                    placeholder="e.g. you@example.com"
                    required
                  />
                </label>

                <label className="field-label">
                  <div className="field-label-header">
                    <span className="field-title">Password</span>
                    <span className="field-sub">SECURITY</span>
                  </div>
                  <input
                    type="password"
                    value={form.password}
                    onChange={change("password")}
                    placeholder="••••••••"
                    required
                    autoComplete="new-password"
                  />
                </label>

                <label className="field-label">
                  <div className="field-label-header">
                    <span className="field-title">Home Postal Location</span>
                    <span className="field-sub">ORIGIN</span>
                  </div>
                  <select
                    value={form.locationId}
                    onChange={change("locationId")}
                    required
                    className="w-full bg-transparent border-0 outline-none pt-2 pb-1 font-sans text-sm text-[#151515]"
                  >
                    <option value="">Select your city...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.city}, {loc.country} ({loc.countryCode})
                      </option>
                    ))}
                  </select>
                </label>
              </>
            )}

            {error && (
              <p className="p-3 bg-[#fff0ed] border-l-2 border-[#ff5a1f] text-xs font-mono text-[#ff5a1f]">
                {error}
              </p>
            )}

            <div className="pt-3">
              <button
                type="submit"
                disabled={busy}
                className="find-button !w-full justify-center !mt-0"
              >
                <span>{busy ? "Entering..." : mode === "login" ? "Sign In" : "Open Mailbox"}</span>
                <small>↗</small>
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-[#e5e5e0] text-center">
            <Link
              href={mode === "login" ? "/register" : "/login"}
              className="font-mono text-xs text-[#6a6a64] hover:text-[#ff5a1f] transition-colors"
            >
              {mode === "login"
                ? "New here? Open an account ↗"
                : "Already have a mailbox? Sign in ↗"}
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-xl mx-auto w-full pt-4 flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-[#6a6a64]">
        <span>DIGITAL POSTAL / 2026</span>
        <span>LETTERS, WITH TIME IN THEM.</span>
      </footer>
    </div>
  );
}
