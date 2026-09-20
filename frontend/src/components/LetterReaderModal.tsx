"use client";

import React, { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle,
  Clock,
  EnvelopeOpen,
  EnvelopeSimple,
  HourglassMedium,
  LockKey,
  MapPin,
  PaperPlaneTilt,
  X,
} from "@phosphor-icons/react";
import StampPreview from "@/components/StampPreview";
import apiClient from "@/lib/api";
import type { IncomingLetter, JourneyEvent, SentLetter } from "@/types";

interface LetterReaderModalProps {
  letter: IncomingLetter | SentLetter | null;
  type: "incoming" | "sent";
  onClose: () => void;
}

export default function LetterReaderModal({
  letter,
  type,
  onClose,
}: LetterReaderModalProps) {
  const [journey, setJourney] = useState<JourneyEvent[]>([]);
  const [loadingJourney, setLoadingJourney] = useState(false);

  useEffect(() => {
    if (!letter) {
      setJourney([]);
      return;
    }

    // In-transit incoming letters cannot view journey per privacy rules (API returns 404)
    if (type === "incoming" && letter.status === "IN_TRANSIT") {
      setJourney([]);
      return;
    }

    setLoadingJourney(true);
    apiClient
      .get<{ letterId: string; events: JourneyEvent[] }>(`/letters/${letter.id}/journey`)
      .then((res) => setJourney(res.data.events || []))
      .catch(() => setJourney([]))
      .finally(() => setLoadingJourney(false));
  }, [letter, type]);

  if (!letter) return null;

  const isInTransitIncoming = type === "incoming" && letter.status === "IN_TRANSIT";
  const isDeliveredIncoming = type === "incoming" && letter.status === "DELIVERED";
  const isSent = type === "sent";

  const inTransit = isInTransitIncoming ? (letter as any) : null;
  const delivered = isDeliveredIncoming ? (letter as any) : null;
  const sent = isSent ? (letter as SentLetter) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-[#151515]/60 backdrop-blur-xs overflow-y-auto animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#ffffff] border border-[#151515] rounded-2xl shadow-[16px_20px_0_rgba(20,20,20,0.12)] p-6 sm:p-10 my-8 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Action Bar */}
        <div className="flex items-center justify-between pb-4 border-b border-[#e5e5e0]">
          <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-wider">
            {isInTransitIncoming ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fff0ed] text-[#ff5a1f] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a1f] animate-pulse" />
                In Transit
              </span>
            ) : letter.status === "DELIVERED" ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#ecfdf5] text-emerald-800 font-semibold">
                <CheckCircle size={14} weight="fill" className="text-emerald-600" />
                Delivered
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#fff0ed] text-[#ff5a1f] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff5a1f] animate-pulse" />
                In Transit
              </span>
            )}
            <span className="text-[#9e9e97]">·</span>
            <span className="text-[#6a6a64]">
              {type === "incoming" ? "Incoming Mail" : "Dispatched Mail"}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-[#6a6a64] hover:text-[#151515] hover:bg-[#f0f0ea] rounded-lg transition-colors"
            aria-label="Close"
          >
            <X size={18} weight="bold" />
          </button>
        </div>

        {/* Modal Content */}
        {isInTransitIncoming ? (
          /* In-Transit Arrival Card */
          <div className="py-8 text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl border border-[#e5e5e0] bg-[#fafaf9] flex items-center justify-center mb-6 text-[#ff5a1f] shadow-xs">
              <EnvelopeSimple size={32} weight="fill" />
            </div>

            <p className="eyebrow text-[#ff5a1f]">IN TRANSIT</p>
            <h2 className="text-2xl sm:text-3xl font-medium tracking-tight text-[#151515] mt-1">
              A letter is traveling to you.
            </h2>

            <div className="mt-6 p-4 bg-[#f8f8f5] border border-[#e5e5e0] rounded-xl max-w-md w-full font-mono text-xs text-left space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[#6a6a64] uppercase">Expected Arrival:</span>
                <span className="font-bold text-[#151515]">{inTransit?.displayEstimate}</span>
              </div>
              <div className="flex items-center justify-between border-t border-[#e5e5e0] pt-2">
                <span className="text-[#6a6a64] uppercase">Estimated UTC:</span>
                <span className="text-[#151515]">
                  {new Date(letter.estimatedDeliveryAtUtc).toLocaleString([], {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </div>
            </div>
          </div>
        ) : (
          /* Revealed / Sent Letter Sheet */
          <div className="pt-6 flex flex-col gap-6">
            {/* Sheet Header */}
            <div className="flex flex-col-reverse sm:flex-row sm:items-start justify-between gap-6 pb-6 border-b border-[#e5e5e0]">
              <div className="space-y-2">
                {delivered && (
                  <div>
                    <span className="eyebrow !m-0 text-[#6a6a64]">From Sender</span>
                    <h3 className="text-xl font-bold text-[#151515]">
                      {delivered.sender?.displayName || "Anonymous Writer"}
                    </h3>
                    <p className="font-mono text-xs text-[#6a6a64]">
                      @{delivered.sender?.username} · {delivered.origin?.city}, {delivered.origin?.country}
                    </p>
                  </div>
                )}

                {sent && (
                  <div>
                    <span className="eyebrow !m-0 text-[#6a6a64]">To Recipient</span>
                    <h3 className="text-xl font-bold text-[#151515]">
                      {sent.recipient?.displayName}
                    </h3>
                    <p className="font-mono text-xs text-[#6a6a64]">
                      @{sent.recipient?.username} · {sent.destination?.city}, {sent.destination?.country}
                    </p>
                  </div>
                )}

                <div className="pt-2 font-mono text-[11px] text-[#6a6a64] flex flex-wrap gap-x-4 gap-y-1">
                  <span>
                    Sent: {new Date(sent?.sentAtUtc || delivered?.sentAtUtc || (letter as any).sentAtUtc || Date.now()).toLocaleDateString([], { dateStyle: "medium" })}
                  </span>
                  <span>·</span>
                  <span>
                    {letter.status === "DELIVERED"
                      ? `Delivered: ${new Date(
                          (letter as any).deliveredAtUtc || letter.estimatedDeliveryAtUtc
                        ).toLocaleDateString([], { dateStyle: "medium" })}`
                      : `Arrival: ${new Date(letter.estimatedDeliveryAtUtc).toLocaleDateString([], { dateStyle: "medium" })}`}
                  </span>
                </div>
              </div>

              {/* Stamps */}
              <div className="flex-shrink-0 self-end sm:self-start">
                <StampPreview
                  from={delivered ? delivered.origin?.city : "Your Desk"}
                  to={delivered ? delivered.destination?.city : sent?.destination?.city}
                  compact
                />
              </div>
            </div>

            {/* Letter Content Area with tactile parchment styling */}
            <div className="bg-[#fafaf9] border border-[#e5e5e0] rounded-xl p-6 sm:p-8 min-h-48">
              <p className="font-serif text-base sm:text-lg text-[#151515] leading-relaxed whitespace-pre-wrap">
                {(letter as any).content || "No message content."}
              </p>
            </div>

            {/* Journey Timeline */}
            <div className="pt-4 border-t border-[#e5e5e0]">
              <div className="flex items-center justify-between mb-4">
                <span className="eyebrow !m-0 text-[#151515]">Postal Journey Log</span>
                <span className="font-mono text-[11px] text-[#6a6a64] uppercase">
                  {loadingJourney ? "Loading..." : `${journey.length} recorded events`}
                </span>
              </div>

              {loadingJourney ? (
                <p className="text-xs font-mono text-[#6a6a64]">Retrieving journey checkpoints...</p>
              ) : journey.length > 0 ? (
                <div className="space-y-3 font-mono text-xs">
                  {journey.map((event, idx) => (
                    <div key={idx} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-[#151515] text-[#ffffff] flex items-center justify-center text-[10px] shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                        <span className="font-semibold text-[#151515]">{event.displayLabel}</span>
                        <span className="text-[11px] text-[#6a6a64]">
                          {new Date(event.occurredAtUtc).toLocaleString([], {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs font-mono text-[#6a6a64]">
                  Letter dispatched. Full transit audit trail recorded at destination hub upon delivery.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Modal Footer */}
        <div className="mt-8 pt-4 border-t border-[#e5e5e0] flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="find-button !mt-0 !py-2 !px-5 !text-xs"
          >
            <span>Close Letter</span>
          </button>
        </div>
      </div>
    </div>
  );
}
