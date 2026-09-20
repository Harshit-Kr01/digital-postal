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
      <div className="desk-page flex flex-col gap-8">
        {/* Studio Stage Area */}
        <div className="studio-stage-area">
          {/* Left Intro Block */}
          <section className="intro-block">
            <p className="eyebrow flex items-center gap-2">
              <span className="status-dot animate-pulse" />
              POSTAL DESK / 01
            </p>
            <h1>
              Good morning,<br />
              <em>{firstName}.</em>
            </h1>
            <p className="intro-copy">
              Your mailbox is open. Write something thoughtful and let the physical distance between two cities set its pace.
            </p>

            <div className="mt-8 flex items-center gap-3">
              <Link href="/compose" className="find-button !mt-0">
                <PaperPlaneTilt size={15} weight="bold" />
                <span>Write a letter</span>
                <small>↗</small>
              </Link>

              <button
                type="button"
                onClick={() => loadMailbox(true)}
                disabled={refreshing}
                className="header-action-btn flex items-center gap-1.5"
                title="Refresh mailbox to check for delivered mail"
              >
                <ArrowClockwise size={14} className={refreshing ? "animate-spin" : ""} />
                <span>{refreshing ? "Checking..." : "Check Mail"}</span>
              </button>
            </div>
          </section>

          {/* Center Stage: Active Postal Dispatch Overview */}
          <div className="canvas-column">
            <div className="w-full max-w-[440px] border border-[#151515] bg-[#ffffff] p-6 rounded-2xl shadow-[10px_12px_0_rgba(20,20,20,0.06)]">
              <div className="flex items-start justify-between border-b border-[#e5e5e0] pb-4">
                <div>
                  <span className="eyebrow !m-0 text-[#ff5a1f]">MAILBOX OVERVIEW</span>
                  <p className="text-base font-bold text-[#151515] mt-1">Ready for Dispatch</p>
                </div>
                <EnvelopeSimple size={22} className="text-[#ff5a1f]" weight="bold" />
              </div>

              <div className="py-6 flex items-center justify-between">
                <div className="space-y-1 font-mono text-xs">
                  <span className="text-[10px] text-[#6a6a64] uppercase block">Postal Office</span>
                  <span className="text-base font-bold text-[#151515]">{city} G.P.O.</span>
                  <span className="text-[#6a6a64] block">{country}</span>
                </div>

                <div className="-mr-2">
                  <StampPreview
                    from={city}
                    to="Worldwide"
                    distanceKm={2500}
                    compact
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-[#e5e5e0] flex items-center justify-between font-mono text-xs text-[#6a6a64]">
                <span>Status: Operational</span>
                <Link href="/compose" className="text-[#ff5a1f] font-semibold hover:underline inline-flex items-center gap-1">
                  <span>Send letter</span>
                  <ArrowUpRight size={12} weight="bold" />
                </Link>
              </div>
            </div>

            <div className="canvas-actions">
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#6a6a64]">
                Home Base: {city}, {country}
              </span>
              <span className="text-[#e5e5e0]">·</span>
              <span className="font-mono text-[11px] uppercase tracking-wider text-[#ff5a1f] font-semibold">
                Mailbox Connected
              </span>
            </div>
          </div>

          {/* Right Flank: Postal Base Card */}
          <aside className="hidden xl:flex flex-col justify-between border border-[#e5e5e0] bg-[#fafaf9] p-6 rounded-2xl max-w-[320px]">
            <div>
              <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-3">
                <span className="eyebrow !m-0">home base</span>
                <Compass size={16} className="text-[#ff5a1f]" weight="fill" />
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <span className="font-mono text-[10px] text-[#6a6a64] uppercase tracking-wider block">Postal City</span>
                  <span className="text-base font-semibold text-[#151515]">{city}</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[#6a6a64] uppercase tracking-wider block">Territory</span>
                  <span className="text-sm text-[#151515]">{country}</span>
                </div>
                <div className="pt-3 border-t border-[#e5e5e0]">
                  <p className="text-xs text-[#6a6a64] leading-relaxed">
                    Location is the first ingredient in calculating delivery pace and stamp route cancellation.
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#e5e5e0]">
              <Link
                href="/settings"
                className="font-mono text-xs font-semibold text-[#151515] hover:text-[#ff5a1f] transition-colors inline-flex items-center gap-1.5 uppercase tracking-wider"
              >
                Change location <ArrowUpRight size={13} weight="bold" />
              </Link>
            </div>
          </aside>
        </div>

        {/* Mailbox Letters Section */}
        <section className="border-t border-[#e5e5e0] pt-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-[#e5e5e0]">
            <div>
              <span className="eyebrow">postal records</span>
              <h2 className="text-2xl font-semibold tracking-tight text-[#151515] mt-1">
                Your Correspondence
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("inbox")}
                className={`header-action-btn ${
                  activeTab === "inbox" ? "!bg-[#151515] !text-[#ffffff] !border-[#151515]" : ""
                }`}
              >
                Inbox ({inboxLetters.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("outbox")}
                className={`header-action-btn ${
                  activeTab === "outbox" ? "!bg-[#151515] !text-[#ffffff] !border-[#151515]" : ""
                }`}
              >
                Dispatched ({outboxLetters.length})
              </button>
            </div>
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
