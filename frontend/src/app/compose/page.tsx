"use client";

import React, { FormEvent, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  MagnifyingGlass,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import AppShell from "@/components/AppShell";
import StampPreview from "@/components/StampPreview";
import { useAuth } from "@/context/AuthContext";
import apiClient, { getErrorMessage } from "@/lib/api";
import type { RecipientSearchResult, SendLetterResponse } from "@/types";
import { calculateDeliveryEstimate } from "@/lib/distance";

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

  const estimate = calculateDeliveryEstimate(
    user?.location,
    recipient
      ? {
          latitude: recipient.locationLatitude,
          longitude: recipient.locationLongitude,
          countryCode: recipient.locationCountryCode,
        }
      : undefined,
  );
  const distanceKm = estimate?.distanceKm;

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
              Dispatched to @{recipient?.username}. Estimated arrival:{" "}
              <strong className="text-[#151515]">
                {new Date(sent.estimatedDeliveryAtUtc).toLocaleString([], {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              </strong>.
            </p>

            <div className="mt-8 pt-8 border-t border-[#e5e5e0] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="font-mono text-xs text-[#6a6a64]">
                {fromCity} ➔ {toCity} ({distanceKm ? `${distanceKm.toLocaleString()} km` : ""})
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setSent(null);
                    setContent("");
                    setRecipient(null);
                    setQuery("");
                  }}
                  className="header-action-btn"
                >
                  Write Another
                </button>
                <Link href="/dashboard" className="find-button !mt-0">
                  <span>View in Mailbox</span>
                  <ArrowRight size={14} weight="bold" />
                </Link>
              </div>
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
            className="border border-[#e5e5e0] bg-[#ffffff] p-4 sm:p-10 rounded-2xl shadow-xs flex flex-col min-h-[480px] sm:min-h-[640px]"
          >
            {/* Sheet Header: Recipient on the left, Stamp nestled in upper-right corner */}
            {/* Sheet Header: Recipient and Stamp placed side by side */}
            <div className="flex flex-row items-center justify-between gap-4 pb-6 border-b border-[#e5e5e0]">
              {/* Left: Recipient Search / Tag */}
              <div className="flex-1 min-w-0 max-w-md">
                <span className="eyebrow block mb-2">to recipient</span>
                {recipient ? (
                  <div className="flex items-center justify-between gap-3 p-3 sm:p-3.5 bg-[#f8f8f5] border border-[#e5e5e0] rounded-xl">
                    <div className="min-w-0 flex-1">
                      <p className="text-base font-bold text-[#151515] leading-snug truncate">{recipient.displayName}</p>
                      <p className="font-mono text-xs text-[#6a6a64] truncate">
                        @{recipient.username} · {recipient.locationCity}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setRecipient(null);
                        setQuery("");
                      }}
                      className="w-8 h-8 rounded-lg text-[#6a6a64] hover:text-[#ff5a1f] hover:bg-[#e5e5e0] flex items-center justify-center transition-colors cursor-pointer shrink-0"
                      title="Remove recipient"
                      aria-label="Remove recipient"
                    >
                      <X size={15} weight="bold" />
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

              {/* Right: The Postage Stamp right beside it */}
              <div className="flex flex-col items-end shrink-0">
                <StampPreview
                  from={fromCity}
                  to={recipient ? toCity : undefined}
                  distanceKm={distanceKm}
                  compact
                />
                {!recipient && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-[#b0b0a8] mt-1.5 hidden sm:block">
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

            {/* Sheet Footer: Character count & Dispatch action */}
            <div className="pt-4 border-t border-[#e5e5e0] flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4 font-mono text-xs text-[#6a6a64]">
                <span>{content.length} / 5000</span>
                {recipient && estimate && (
                  <>
                    <span>·</span>
                    <span className="text-[#ff5a1f]" title={`Arrival estimate: ${estimate.displayEstimate}`}>
                      {estimate.durationLabel} ({estimate.displayEstimate})
                    </span>
                  </>
                )}
              </div>

              <button
                type="submit"
                disabled={busy || !recipient || !content.trim()}
                className="find-button !mt-0 w-full sm:w-auto sm:min-w-44 justify-center"
              >
                <PaperPlaneTilt size={15} weight="bold" />
                <span>{busy ? "Dispatching..." : "Dispatch letter"}</span>
              </button>
            </div>
          </form>
        </div>
      )}
    </AppShell>
  );
}
