"use client";

import React, { ChangeEvent, FocusEvent, FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, WarningCircle } from "@phosphor-icons/react";
import apiClient, { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import {
  validateDisplayName,
  validateEmail,
  validateLocation,
  validatePassword,
  validateUsername,
  validateUsernameOrEmail,
} from "@/lib/validation";
import type { PostalLocation } from "@/types";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
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

  // Validate a single field
  const validateField = (name: keyof typeof form, value: string): string | null => {
    if (mode === "login") {
      if (name === "usernameOrEmail") return validateUsernameOrEmail(value);
      if (name === "password") return validatePassword(value, true);
      return null;
    }

    switch (name) {
      case "displayName":
        return validateDisplayName(value);
      case "username":
        return validateUsername(value);
      case "email":
        return validateEmail(value);
      case "password":
        return validatePassword(value, false);
      case "locationId":
        return validateLocation(value);
      default:
        return null;
    }
  };

  const change =
    (key: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const val = e.target.value;
      setForm((prev) => ({ ...prev, [key]: val }));

      // If user had an error on this field, revalidate live to clear or update it
      if (touched[key] || fieldErrors[key]) {
        const err = validateField(key, val);
        setFieldErrors((prev) => {
          const next = { ...prev };
          if (err) {
            next[key] = err;
          } else {
            delete next[key];
          }
          return next;
        });
      }

      if (error) {
        setError("");
      }
    };

  const blur = (key: keyof typeof form) => (e: FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTouched((prev) => ({ ...prev, [key]: true }));
    const err = validateField(key, e.target.value);
    setFieldErrors((prev) => {
      const next = { ...prev };
      if (err) {
        next[key] = err;
      } else {
        delete next[key];
      }
      return next;
    });
  };

  const validateAll = (): { isValid: boolean; errors: Record<string, string>; firstError: string | null } => {
    const errors: Record<string, string> = {};

    if (mode === "login") {
      const idErr = validateUsernameOrEmail(form.usernameOrEmail);
      if (idErr) errors.usernameOrEmail = idErr;

      const pwdErr = validatePassword(form.password, true);
      if (pwdErr) errors.password = pwdErr;
    } else {
      const nameErr = validateDisplayName(form.displayName);
      if (nameErr) errors.displayName = nameErr;

      const userErr = validateUsername(form.username);
      if (userErr) errors.username = userErr;

      const emailErr = validateEmail(form.email);
      if (emailErr) errors.email = emailErr;

      const pwdErr = validatePassword(form.password, false);
      if (pwdErr) errors.password = pwdErr;

      const locErr = validateLocation(form.locationId);
      if (locErr) errors.locationId = locErr;
    }

    const firstError = Object.values(errors)[0] || null;
    return { isValid: Object.keys(errors).length === 0, errors, firstError };
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");

    // Client-side validation check
    const { isValid, errors, firstError } = validateAll();
    if (!isValid) {
      setFieldErrors(errors);
      setTouched({
        usernameOrEmail: true,
        username: true,
        displayName: true,
        email: true,
        password: true,
        locationId: true,
      });
      if (firstError) {
        setError(firstError);
      }
      return;
    }

    setBusy(true);
    try {
      if (mode === "login") {
        await login({
          usernameOrEmail: form.usernameOrEmail.trim(),
          password: form.password,
        });
      } else {
        await register({
          username: form.username.trim(),
          displayName: form.displayName.trim(),
          email: form.email.trim(),
          password: form.password,
          locationId: form.locationId,
        });
      }
      router.push("/dashboard");
    } catch (err) {
      const backendMessage = getErrorMessage(err);
      setError(backendMessage);

      // Match backend error messages to respective fields
      const lower = backendMessage.toLowerCase();
      if (lower.includes("username")) {
        setFieldErrors((prev) => ({ ...prev, username: backendMessage }));
      } else if (lower.includes("email")) {
        setFieldErrors((prev) => ({ ...prev, email: backendMessage }));
      } else if (lower.includes("password")) {
        setFieldErrors((prev) => ({ ...prev, password: backendMessage }));
      } else if (lower.includes("credential")) {
        setFieldErrors((prev) => ({
          ...prev,
          password: backendMessage,
          usernameOrEmail: backendMessage,
        }));
      } else if (lower.includes("location")) {
        setFieldErrors((prev) => ({ ...prev, locationId: backendMessage }));
      }
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

          <form onSubmit={submit} className="mt-8 flex flex-col gap-5" noValidate>
            {mode === "login" ? (
              <>
                <label className={`field-label ${fieldErrors.usernameOrEmail ? "!border-b-[#ff5a1f]" : ""}`}>
                  <div className="field-label-header">
                    <span className="field-title">Username or Email</span>
                    <span className="field-sub">IDENTITY</span>
                  </div>
                  <input
                    type="text"
                    value={form.usernameOrEmail}
                    onChange={change("usernameOrEmail")}
                    onBlur={blur("usernameOrEmail")}
                    placeholder="e.g. postal_writer or user@example.com"
                    required
                    autoComplete="username"
                    aria-invalid={!!fieldErrors.usernameOrEmail}
                  />
                  {fieldErrors.usernameOrEmail && (
                    <span className="text-[11px] font-mono text-[#ff5a1f] mt-1.5 block">
                      {fieldErrors.usernameOrEmail}
                    </span>
                  )}
                </label>

                <label className={`field-label ${fieldErrors.password ? "!border-b-[#ff5a1f]" : ""}`}>
                  <div className="field-label-header">
                    <span className="field-title">Password</span>
                    <span className="field-sub">KEY</span>
                  </div>
                  <input
                    type="password"
                    value={form.password}
                    onChange={change("password")}
                    onBlur={blur("password")}
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                    aria-invalid={!!fieldErrors.password}
                  />
                  {fieldErrors.password && (
                    <span className="text-[11px] font-mono text-[#ff5a1f] mt-1.5 block">
                      {fieldErrors.password}
                    </span>
                  )}
                </label>
              </>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <label className={`field-label ${fieldErrors.displayName ? "!border-b-[#ff5a1f]" : ""}`}>
                    <div className="field-label-header">
                      <span className="field-title">Full Name</span>
                      <span className="field-sub">NAME</span>
                    </div>
                    <input
                      type="text"
                      value={form.displayName}
                      onChange={change("displayName")}
                      onBlur={blur("displayName")}
                      placeholder="e.g. Eleanor Vance"
                      maxLength={80}
                      required
                      aria-invalid={!!fieldErrors.displayName}
                    />
                    {fieldErrors.displayName && (
                      <span className="text-[11px] font-mono text-[#ff5a1f] mt-1.5 block">
                        {fieldErrors.displayName}
                      </span>
                    )}
                  </label>

                  <label className={`field-label ${fieldErrors.username ? "!border-b-[#ff5a1f]" : ""}`}>
                    <div className="field-label-header">
                      <span className="field-title">Username</span>
                      <span className="field-sub">HANDLE</span>
                    </div>
                    <input
                      type="text"
                      value={form.username}
                      onChange={change("username")}
                      onBlur={blur("username")}
                      placeholder="e.g. eleanor"
                      minLength={3}
                      maxLength={30}
                      pattern="^[a-zA-Z0-9_]{3,30}$"
                      title="Username must be 3-30 characters long and contain only letters, numbers, or underscores."
                      required
                      autoComplete="username"
                      aria-invalid={!!fieldErrors.username}
                    />
                    {fieldErrors.username ? (
                      <span className="text-[11px] font-mono text-[#ff5a1f] mt-1.5 block">
                        {fieldErrors.username}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-[#6a6a64] mt-1.5 block">
                        3–30 characters, letters, numbers, or underscores
                      </span>
                    )}
                  </label>
                </div>

                <label className={`field-label ${fieldErrors.email ? "!border-b-[#ff5a1f]" : ""}`}>
                  <div className="field-label-header">
                    <span className="field-title">Email</span>
                    <span className="field-sub">CONTACT</span>
                  </div>
                  <input
                    type="email"
                    value={form.email}
                    onChange={change("email")}
                    onBlur={blur("email")}
                    placeholder="e.g. you@example.com"
                    required
                    autoComplete="email"
                    aria-invalid={!!fieldErrors.email}
                  />
                  {fieldErrors.email && (
                    <span className="text-[11px] font-mono text-[#ff5a1f] mt-1.5 block">
                      {fieldErrors.email}
                    </span>
                  )}
                </label>

                <label className={`field-label ${fieldErrors.password ? "!border-b-[#ff5a1f]" : ""}`}>
                  <div className="field-label-header">
                    <span className="field-title">Password</span>
                    <span className="field-sub">SECURITY</span>
                  </div>
                  <input
                    type="password"
                    value={form.password}
                    onChange={change("password")}
                    onBlur={blur("password")}
                    placeholder="••••••••"
                    minLength={8}
                    title="Password must be at least 8 characters long."
                    required
                    autoComplete="new-password"
                    aria-invalid={!!fieldErrors.password}
                  />
                  {fieldErrors.password ? (
                    <span className="text-[11px] font-mono text-[#ff5a1f] mt-1.5 block">
                      {fieldErrors.password}
                    </span>
                  ) : (
                    <span className="text-[11px] font-mono text-[#6a6a64] mt-1.5 block">
                      Minimum 8 characters
                    </span>
                  )}
                </label>

                <label className={`field-label ${fieldErrors.locationId ? "!border-b-[#ff5a1f]" : ""}`}>
                  <div className="field-label-header">
                    <span className="field-title">Home Postal Location</span>
                    <span className="field-sub">ORIGIN</span>
                  </div>
                  <select
                    value={form.locationId}
                    onChange={change("locationId")}
                    onBlur={blur("locationId")}
                    required
                    aria-invalid={!!fieldErrors.locationId}
                    className="w-full bg-transparent border-0 outline-none pt-2 pb-1 font-sans text-sm text-[#151515]"
                  >
                    <option value="">Select your city...</option>
                    {locations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.city}, {loc.country} ({loc.countryCode})
                      </option>
                    ))}
                  </select>
                  {fieldErrors.locationId && (
                    <span className="text-[11px] font-mono text-[#ff5a1f] mt-1.5 block">
                      {fieldErrors.locationId}
                    </span>
                  )}
                </label>
              </>
            )}

            {error && (
              <div
                role="alert"
                aria-live="polite"
                className="p-3.5 bg-[#fff0ed] border-l-2 border-[#ff5a1f] text-xs font-mono text-[#ff5a1f] flex items-start gap-2.5 rounded-r"
              >
                <WarningCircle size={16} weight="bold" className="shrink-0 mt-0.5 text-[#ff5a1f]" />
                <span className="leading-relaxed">{error}</span>
              </div>
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
