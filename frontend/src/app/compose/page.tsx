"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  LockKey,
  MagnifyingGlass,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import AppShell from "@/components/AppShell";
import StampPreview from "@/components/StampPreview";
import { useAuth } from "@/context/AuthContext";
import apiClient, { getErrorMessage } from "@/lib/api";
import type { RecipientSearchResult, SendLetterResponse } from "@/types";
import { distanceBetweenLocations } from "@/lib/distance";

function estimateTravelTime(distanceKm?: number): string {
  if (distanceKm == null) return "Calculated after choosing recipient";
  if (distanceKm <= 200) return "~6 hours";
  if (distanceKm <= 500) return "~18 hours";
  if (distanceKm <= 1200) return "~1.5 days";
  if (distanceKm <= 3000) return "~2.5 days";
  if (distanceKm <= 7000) return "~4 days";
  return "~5 to 6 days";
}

export default function ComposePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<RecipientSearchResult[]>([]);
  const [recipient, setRecipient] = useState<RecipientSearchResult | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState<SendLetterResponse | null>(null);
  const [busy, setBusy] = useState(false);

  const fromCity = user?.location?.city || "Your Desk";
  const toCity = recipient?.locationCity || "Recipient";

  const distanceKm = distanceBetweenLocations(
    user?.location,
    recipient
      ? {
          latitude: recipient.locationLatitude,
          longitude: recipient.locationLongitude,
        }
      : undefined
  );

  async function search(value: string) {
    setQuery(value);
    setRecipient(null);
    if (value.trim().length < 2) {
      setMatches([]);
      return;
    }
    try {
      const response = await apiClient.get<RecipientSearchResult[]>(
        "/users/search",
        { params: { q: value } }
      );
      setMatches(response.data);
    } catch (reason) {
      setError(getErrorMessage(reason));
    }
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!recipient || !content.trim()) return;
    setBusy(true);
    setError("");
    try {
      const response = await apiClient.post<SendLetterResponse>(
        "/letters",
        { recipientId: recipient.id, content: content.trim() },
        { headers: { "Idempotency-Key": crypto.randomUUID() } }
      );
      setSent(response.data);
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      {sent ? (
        /* Dispatch Confirmation Screen */
        <div className="max-w-2xl mx-auto w-full py-10">
          <section className="border border-[#151515] bg-[#ffffff] p-8 sm:p-12 shadow-[12px_14px_0_rgba(20,20,20,0.06)] rounded-2xl">
            <div className="flex items-center gap-3">
              <span className="w-9 h-9 rounded-full bg-[#151515] text-[#ffffff] flex items-center justify-center">
                <Check size={18} weight="bold" />
              </span>
              <span className="eyebrow !m-0 text-[#ff5a1f]">DISPATCH CONFIRMED</span>
            </div>

            <h1 className="text-4xl sm:text-5xl font-medium tracking-tight mt-6">
              Your letter is moving.
            </h1>

            <p className="mt-4 text-base text-[#6a6a64] leading-relaxed">
              It has been sealed and dispatched to @{recipient?.username}. Estimated arrival:{" "}
              <strong className="text-[#151515]">
                {new Date(sent.estimatedDeliveryAtUtc).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </strong>.
            </p>

            <div className="mt-8 pt-8 border-t border-[#e5e5e0] flex items-center justify-between">
              <span className="font-mono text-xs text-[#6a6a64]">
                {fromCity} ➔ {toCity} ({distanceKm ? `${distanceKm.toLocaleString()} km` : ""})
              </span>
              <Link href="/dashboard" className="find-button !mt-0">
                <span>Return to Desk</span>
                <ArrowRight size={14} weight="bold" />
              </Link>
            </div>
          </section>
        </div>
      ) : (
        /* Full-Sheet Letter Writing Desk */
        <div className="max-w-4xl mx-auto w-full flex flex-col gap-5 py-2">
          {/* Top Kicker Line */}
          <div className="flex items-center justify-between font-mono text-xs uppercase tracking-[0.1em] text-[#6a6a64] pb-2 border-b border-[#e5e5e0]">
            <span className="flex items-center gap-2">
              <span className="status-dot" />
              <span>PRIVATE CORRESPONDENCE</span>
            </span>
            <span>{fromCity.toUpperCase()} G.P.O.</span>
          </div>

          <form
            onSubmit={submit}
            className="border border-[#e5e5e0] bg-[#ffffff] p-6 sm:p-10 rounded-2xl shadow-xs flex flex-col min-h-[640px]"
          >
            {/* Sheet Header: Recipient on the left, Stamp nestled in upper-right corner */}
            <div className="flex items-start justify-between gap-6 pb-6 border-b border-[#e5e5e0]">
              {/* Left: Recipient Search / Tag */}
              <div className="flex-1 max-w-md">
                <span className="eyebrow block mb-2">to recipient</span>
                {recipient ? (
                  <div className="flex items-center justify-between p-3.5 bg-[#f8f8f5] border border-[#e5e5e0] rounded-xl">
                    <div>
                      <p className="text-base font-bold text-[#151515] leading-snug">{recipient.displayName}</p>
                      <p className="font-mono text-xs text-[#6a6a64]">
                        @{recipient.username} · {recipient.locationCity}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipient(null);
                        setQuery("");
                      }}
                      className="header-action-btn !py-1 !px-2.5 !text-[10px]"
                      title="Change recipient"
                    >
                      <X size={12} />
                      <span>change</span>
                    </button>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative flex items-center">
                      <MagnifyingGlass className="absolute left-3 text-[#6a6a64]" size={17} />
                      <input
                        type="text"
                        value={query}
                        onChange={(e) => search(e.target.value)}
                        placeholder="Search recipient by username..."
                        className="w-full bg-[#f8f8f5] border border-[#e5e5e0] focus:border-[#151515] rounded-xl py-2.5 pl-9 pr-4 text-sm outline-none transition-colors"
                      />
                    </div>

                    {matches.length > 0 && (
                      <div className="absolute top-full left-0 right-0 mt-1.5 bg-[#ffffff] border border-[#151515] rounded-xl shadow-lg z-20 max-h-52 overflow-y-auto">
                        {matches.map((match) => (
                          <button
                            key={match.id}
                            type="button"
                            onClick={() => {
                              setRecipient(match);
                              setMatches([]);
                            }}
                            className="w-full text-left p-3 hover:bg-[#f8f8f5] border-b border-[#e5e5e0] last:border-0 transition-colors flex items-center justify-between"
                          >
                            <div>
                              <p className="text-xs font-semibold text-[#151515]">{match.displayName}</p>
                              <p className="font-mono text-[11px] text-[#6a6a64]">@{match.username}</p>
                            </div>
                            <span className="font-mono text-[11px] text-[#ff5a1f] uppercase">
                              {match.locationCity}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Upper-Right Corner: The Postage Stamp */}
              <div className="flex flex-col items-end flex-shrink-0">
                <StampPreview
                  from={fromCity}
                  to={recipient ? toCity : undefined}
                  distanceKm={distanceKm}
                  compact
                />
                {!recipient && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#b0b0a8] mt-1.5">
                    stamp / pending
                  </span>
                )}
              </div>
            </div>

            {/* Main Letter Body - Taking Most of the Page */}
            <div className="py-6 flex-1 flex flex-col">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start writing your letter here..."
                maxLength={5000}
                required
                rows={14}
                className="w-full flex-1 border-0 outline-none bg-transparent resize-none text-base sm:text-lg leading-relaxed text-[#151515] font-sans placeholder:text-[#b0b0a8]"
              />
            </div>

            {/* Error Message if any */}
            {error && (
              <p className="mb-4 p-3 bg-[#fff0ed] border-l-2 border-[#ff5a1f] text-xs text-[#ff5a1f]">
                {error}
              </p>
            )}

            {/* Sheet Footer: Sealed indicator, Character count & Dispatch action */}
            <div className="pt-4 border-t border-[#e5e5e0] flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 font-mono text-xs text-[#6a6a64]">
                <span className="flex items-center gap-1.5">
                  <LockKey size={13} weight="fill" />
                  <span>Sealed until arrival</span>
                </span>
                <span>·</span>
                <span>{content.length} / 5000</span>
                {recipient && distanceKm && (
                  <>
                    <span>·</span>
                    <span className="text-[#ff5a1f]">{estimateTravelTime(distanceKm)}</span>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={busy || !recipient || !content.trim()}
                className="find-button !mt-0 sm:min-w-44"
              >
                <PaperPlaneTilt size={15} weight="bold" />
                <span>{busy ? "Dispatching..." : "Dispatch letter"}</span>
                <small>↗</small>
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
