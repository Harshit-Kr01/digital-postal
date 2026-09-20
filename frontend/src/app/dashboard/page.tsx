"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowClockwise,
  ArrowUpRight,
  CheckCircle,
  Compass,
  EnvelopeOpen,
  EnvelopeSimple,
  HourglassMedium,
  LockKey,
  MapPin,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import AppShell from "@/components/AppShell";
import StampPreview from "@/components/StampPreview";
import LetterReaderModal from "@/components/LetterReaderModal";
import { useAuth } from "@/context/AuthContext";
import apiClient, { getErrorMessage } from "@/lib/api";
import type { IncomingLetter, PagedResult, SentLetter } from "@/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<"inbox" | "outbox">("inbox");
  const [inboxLetters, setInboxLetters] = useState<IncomingLetter[]>([]);
  const [outboxLetters, setOutboxLetters] = useState<SentLetter[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedLetter, setSelectedLetter] = useState<IncomingLetter | SentLetter | null>(null);
  const [selectedType, setSelectedType] = useState<"incoming" | "sent">("incoming");

  const city = user?.location?.city || "New Delhi";
  const country = user?.location?.country || "India";
  const firstName = user?.displayName ? user.displayName.split(" ")[0] : "Friend";
  const [greeting, setGreeting] = useState("Good day");

  useEffect(() => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) {
      setGreeting("Good morning");
    } else if (hour >= 12 && hour < 18) {
      setGreeting("Good afternoon");
    } else {
      setGreeting("Good evening");
    }
  }, []);

  async function loadMailbox(isManual = false) {
    if (isManual) setRefreshing(true);
    else setLoading(true);

    try {
      const [inboxRes, outboxRes] = await Promise.all([
        apiClient.get<PagedResult<IncomingLetter>>("/mailbox/incoming"),
        apiClient.get<PagedResult<SentLetter>>("/mailbox/sent"),
      ]);

      setInboxLetters(inboxRes.data.items || []);
      setOutboxLetters(outboxRes.data.items || []);
    } catch (err) {
      console.error("Failed to load mailbox:", getErrorMessage(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    if (user) {
      loadMailbox();
    }
  }, [user]);

  const inTransitCount =
    inboxLetters.filter((l) => l.status === "IN_TRANSIT").length +
    outboxLetters.filter((l) => l.status === "IN_TRANSIT").length;

  const deliveredCount =
    inboxLetters.filter((l) => l.status === "DELIVERED").length +
    outboxLetters.filter((l) => l.status === "DELIVERED").length;

  return (
    <AppShell>
      <div className="desk-page flex flex-col gap-5">
        {/* Clean, Minimal Mailbox Header */}
        <div className="flex items-center justify-between gap-4 pb-4 border-b border-[#e5e5e0]">
          <div>
            <div className="flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-[#6a6a64]">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              <span>{city} G.P.O.</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-[#151515] mt-0.5">
              {greeting}, <em>{firstName}</em>.
            </h1>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/compose"
              className="hidden sm:inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full bg-[#151515] !text-white hover:bg-[#ff5a1f] font-mono text-xs font-semibold uppercase tracking-wider transition-colors shadow-xs"
            >
              <PaperPlaneTilt size={13} weight="bold" className="!text-white" />
              <span className="!text-white">Write</span>
            </Link>

            <button
              type="button"
              onClick={() => loadMailbox(true)}
              disabled={refreshing}
              className="w-9 h-9 rounded-full border border-[#e5e5e0] hover:border-[#151515] hover:bg-[#fafaf9] flex items-center justify-center text-[#151515] transition-colors cursor-pointer active:scale-95 shrink-0"
              title="Refresh mailbox"
              aria-label="Refresh mailbox"
            >
              <ArrowClockwise size={15} className={refreshing ? "animate-spin" : ""} weight="bold" />
            </button>
          </div>
        </div>

        {/* Mailbox Letters Section */}
        <section className="flex flex-col gap-4">
          {/* Segmented Tabs Control */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-[#f0f0ea] rounded-xl max-w-xs sm:max-w-sm">
            <button
              type="button"
              onClick={() => setActiveTab("inbox")}
              className={`py-2 px-3 rounded-lg font-mono text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "inbox"
                  ? "bg-[#ffffff] text-[#151515] shadow-xs"
                  : "text-[#6a6a64] hover:text-[#151515]"
              }`}
            >
              <span>Inbox</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#e5e5e0] text-[#151515]">
                {inboxLetters.length}
              </span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("outbox")}
              className={`py-2 px-3 rounded-lg font-mono text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === "outbox"
                  ? "bg-[#ffffff] text-[#151515] shadow-xs"
                  : "text-[#6a6a64] hover:text-[#151515]"
              }`}
            >
              <span>Dispatched</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-[#e5e5e0] text-[#151515]">
                {outboxLetters.length}
              </span>
            </button>
          </div>

          {/* Letter List */}
          {loading ? (
            <div className="py-14 text-center border-b border-[#e5e5e0] bg-[#fafaf9] rounded-2xl mt-6 px-6">
              <p className="font-mono text-xs text-[#6a6a64]">Checking mailbox records...</p>
            </div>
          ) : activeTab === "inbox" ? (
            inboxLetters.length === 0 ? (
              <div className="py-14 text-center border-b border-[#e5e5e0] bg-[#fafaf9] rounded-2xl mt-6 px-6">
                <div className="w-12 h-12 rounded-full border border-[#e5e5e0] bg-[#ffffff] flex items-center justify-center mx-auto mb-4 text-[#ff5a1f]">
                  <EnvelopeSimple size={22} weight="thin" />
                </div>
                <h3 className="text-lg font-semibold text-[#151515]">No letters in transit or delivered yet</h3>
                <p className="mt-2 text-sm text-[#6a6a64] max-w-md mx-auto leading-relaxed">
                  When someone sends you a letter, its journey will appear here with an arrival estimate.
                </p>
                <div className="mt-6">
                  <Link href="/compose" className="find-button !inline-flex !mt-0">
                    <PaperPlaneTilt size={14} weight="bold" />
                    <span>Compose First Letter</span>
                    <small>↗</small>
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-6 flex flex-col gap-3">
                {inboxLetters.map((letter) => {
                  const isInTransit = letter.status === "IN_TRANSIT";
                  const delivered = !isInTransit ? (letter as any) : null;

                  return (
                    <div
                      key={letter.id}
                      onClick={() => {
                        setSelectedLetter(letter);
                        setSelectedType("incoming");
                      }}
                      className="p-5 border border-[#e5e5e0] bg-[#ffffff] hover:border-[#151515] rounded-2xl transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      <div className="flex items-start gap-4">
                        <div
                          className={`w-10 h-10 rounded-xl border border-[#e5e5e0] flex items-center justify-center shrink-0 mt-0.5 ${
                            isInTransit ? "bg-[#fff0ed] text-[#ff5a1f]" : "bg-[#ecfdf5] text-emerald-700"
                          }`}
                        >
                          {isInTransit ? <LockKey size={20} weight="fill" /> : <EnvelopeOpen size={20} weight="fill" />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-[#151515]">
                              {isInTransit ? "Incoming Letter" : delivered?.sender?.displayName || "Delivered Letter"}
                            </span>

                            {isInTransit ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff0ed] text-[#ff5a1f] font-mono text-[10px] font-semibold">
                                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a1f] animate-pulse" />
                                In Transit
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ecfdf5] text-emerald-800 font-mono text-[10px] font-semibold">
                                <CheckCircle size={12} weight="fill" className="text-emerald-600" />
                                Delivered
                              </span>
                            )}
                          </div>

                          <p className="font-mono text-xs text-[#6a6a64] mt-0.5">
                            {isInTransit ? (
                              <>
                                Expected: <strong className="text-[#151515]">{(letter as any).displayEstimate}</strong>
                              </>
                            ) : (
                              <>
                                From @{delivered?.sender?.username} ({delivered?.origin?.city}, {delivered?.origin?.country}) · Delivered{" "}
                                {new Date(delivered?.deliveredAtUtc || letter.estimatedDeliveryAtUtc).toLocaleDateString([], {
                                  dateStyle: "medium",
                                })}
                              </>
                            )}
                          </p>

                          {!isInTransit && delivered?.content && (
                            <p className="font-serif text-sm text-[#6a6a64] line-clamp-1 mt-1.5 italic">
                              &ldquo;{delivered.content}&rdquo;
                            </p>
                          )}
                        </div>
                      </div>

                      <button
                        type="button"
                        className={isInTransit ? "header-action-btn !text-[11px] !py-1.5 !px-3 self-end sm:self-center" : "find-button !mt-0 !text-[11px] !py-1.5 !px-3 self-end sm:self-center"}
                      >
                        <span>{isInTransit ? "Inspect Card" : "Open Letter"}</span>
                        <small>↗</small>
                      </button>
                    </div>
                  );
                })}
              </div>
            )
          ) : outboxLetters.length === 0 ? (
            <div className="py-14 text-center border-b border-[#e5e5e0] bg-[#fafaf9] rounded-2xl mt-6 px-6">
              <div className="w-12 h-12 rounded-full border border-[#e5e5e0] bg-[#ffffff] flex items-center justify-center mx-auto mb-4 text-[#ff5a1f]">
                <EnvelopeSimple size={22} weight="thin" />
              </div>
              <h3 className="text-lg font-semibold text-[#151515]">No letters dispatched yet</h3>
              <p className="mt-2 text-sm text-[#6a6a64] max-w-md mx-auto leading-relaxed">
                Choose a recipient and write your first letter. Distance will determine when they receive it.
              </p>
              <div className="mt-6">
                <Link href="/compose" className="find-button !inline-flex !mt-0">
                  <PaperPlaneTilt size={14} weight="bold" />
                  <span>Compose First Letter</span>
                  <small>↗</small>
                </Link>
              </div>
            </div>
          ) : (
            <div className="mt-6 flex flex-col gap-3">
              {outboxLetters.map((letter) => {
                const isDelivered = letter.status === "DELIVERED";

                return (
                  <div
                    key={letter.id}
                    onClick={() => {
                      setSelectedLetter(letter);
                      setSelectedType("sent");
                    }}
                    className="p-5 border border-[#e5e5e0] bg-[#ffffff] hover:border-[#151515] rounded-2xl transition-all cursor-pointer shadow-2xs hover:shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-xl border border-[#e5e5e0] bg-[#fafaf9] flex items-center justify-center text-[#151515] shrink-0 mt-0.5">
                        <PaperPlaneTilt size={20} weight="fill" />
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm text-[#151515]">
                            To {letter.recipient?.displayName} (@{letter.recipient?.username})
                          </span>

                          {isDelivered ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#ecfdf5] text-emerald-800 font-mono text-[10px] font-semibold">
                              <CheckCircle size={12} weight="fill" className="text-emerald-600" />
                              Delivered
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#fff0ed] text-[#ff5a1f] font-mono text-[10px] font-semibold">
                              <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a1f] animate-pulse" />
                              In Transit
                            </span>
                          )}
                        </div>

                        <p className="font-mono text-xs text-[#6a6a64] mt-0.5">
                          Destination: {letter.destination?.city}, {letter.destination?.country} · Sent{" "}
                          {new Date(letter.sentAtUtc).toLocaleDateString([], { dateStyle: "medium" })}
                          {!isDelivered && (
                            <>
                              {" "}· Est. Arrival:{" "}
                              {new Date(letter.estimatedDeliveryAtUtc).toLocaleDateString([], {
                                dateStyle: "medium",
                              })}
                            </>
                          )}
                        </p>

                        {letter.content && (
                          <p className="font-serif text-sm text-[#6a6a64] line-clamp-1 mt-1.5 italic">
                            &ldquo;{letter.content}&rdquo;
                          </p>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      className="header-action-btn !text-[11px] !py-1.5 !px-3 self-end sm:self-center"
                    >
                      <span>View Letter</span>
                      <ArrowUpRight size={12} weight="bold" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Bottom Control Strip */}
        <section className="controls-column">
          <div className="field-label">
            <div className="field-label-header">
              <span className="field-title">Letters In Transit</span>
              <span className="field-sub">TRAVELING</span>
            </div>
            <div className="font-mono text-xl font-bold text-[#151515] mt-1">{inTransitCount}</div>
            <p className="text-xs text-[#6a6a64] mt-1">Pacing across physical distance</p>
          </div>

          <div className="field-label">
            <div className="field-label-header">
              <span className="field-title">Delivered Letters</span>
              <span className="field-sub">ARCHIVE</span>
            </div>
            <div className="font-mono text-xl font-bold text-[#151515] mt-1">{deliveredCount}</div>
            <p className="text-xs text-[#6a6a64] mt-1">Ready to open and read</p>
          </div>

          <div className="field-label">
            <div className="field-label-header">
              <span className="field-title">Postal Origin</span>
              <span className="field-sub">LOCATION</span>
            </div>
            <div className="font-mono text-xl font-bold text-[#151515] mt-1">{city}</div>
            <p className="text-xs text-[#6a6a64] mt-1">{country} G.P.O.</p>
          </div>

          <Link href="/compose" className="find-button self-end">
            <PaperPlaneTilt size={15} weight="bold" />
            <span>Write a letter</span>
            <small>↗</small>
          </Link>
        </section>
      </div>

      {/* Letter Reader / Postal Journey Modal */}
      {selectedLetter && (
        <LetterReaderModal
          letter={selectedLetter}
          type={selectedType}
          onClose={() => setSelectedLetter(null)}
        />
      )}
    </AppShell>
  );
}
