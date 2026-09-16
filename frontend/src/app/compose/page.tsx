"use client";

import { FormEvent, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  MagnifyingGlass,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import Link from "next/link";
import AppShell from "@/components/AppShell";
import StampPreview from "@/components/StampPreview";
import { useAuth } from "@/context/AuthContext";
import apiClient, { getErrorMessage } from "@/lib/api";
import { RecipientSearchResult, SendLetterResponse } from "@/types";
import { distanceBetweenLocations } from "@/lib/distance";

export default function ComposePage() {
  const { user } = useAuth();
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<RecipientSearchResult[]>([]);
  const [recipient, setRecipient] = useState<RecipientSearchResult | null>(
    null,
  );
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState<SendLetterResponse | null>(null);
  const [busy, setBusy] = useState(false);
  const distanceKm = distanceBetweenLocations(user?.location, recipient ? {
    latitude: recipient.locationLatitude,
    longitude: recipient.locationLongitude,
  } : undefined);

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
        { params: { q: value } },
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
        { headers: { "Idempotency-Key": crypto.randomUUID() } },
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
      <Link
        href="/dashboard"
        className="mb-10 inline-flex items-center gap-2 text-xs font-bold"
      >
        <ArrowLeft size={15} /> Back to desk
      </Link>
      {sent ? (
        <section className="max-w-2xl border border-[#141414] bg-white p-7 md:p-10">
          <div className="flex h-10 w-10 items-center justify-center bg-[#5d43bb] text-white">
            <Check size={22} />
          </div>
          <p className="eyebrow mt-8">dispatch confirmed</p>
          <h1 className="serif mt-4 text-6xl tracking-[-.05em]">
            Your letter is moving.
          </h1>
          <p className="mt-5 text-sm leading-6 text-[#6d6d6d]">
            It is on its way to @{recipient?.username}. Estimated delivery:{" "}
            {new Date(sent.estimatedDeliveryAtUtc).toLocaleString([], {
              dateStyle: "medium",
              timeStyle: "short",
            })}
            .
          </p>
          <div className="mt-8 max-w-xs">
            <StampPreview
              from={user?.location?.city}
              to={recipient?.locationCity}
              distanceKm={distanceKm}
            />
          </div>
          <Link href="/dashboard" className="button-primary mt-8">
            Return to desk <ArrowRight size={15} />
          </Link>
        </section>
      ) : (
        <div className="grid gap-10 lg:grid-cols-[.72fr_1.28fr]">
          <div>
            <p className="eyebrow">new dispatch</p>
            <h1 className="serif mt-4 text-6xl tracking-[-.055em]">
              Write something worth waiting for.
            </h1>
            <p className="mt-6 text-sm leading-6 text-[#6d6d6d]">
              The content stays sealed while your letter is in transit. Choose a
              recipient by username to begin.
            </p>
            <div className="mt-10 hidden lg:block">
              <StampPreview
                from={user?.location?.city}
                to={recipient?.locationCity}
                distanceKm={distanceKm}
              />
            </div>
          </div>
          <form
            onSubmit={submit}
            className="border border-[#141414] bg-white p-6 md:p-8"
          >
            <label className="eyebrow">recipient</label>
            <div className="relative mt-3">
              <MagnifyingGlass
                className="pointer-events-none absolute left-3 top-3.5 text-[#6d6d6d]"
                size={17}
              />
              <input
                className="field !pl-11"
                placeholder="Search username"
                value={query}
                onChange={(event) => search(event.target.value)}
                disabled={!!recipient}
              />
            </div>
            {matches.length > 0 && !recipient && (
              <div className="mt-1 border border-t-0 editorial-rule bg-white">
                {matches.map((match) => (
                  <button
                    type="button"
                    key={match.id}
                    onClick={() => {
                      setRecipient(match);
                      setMatches([]);
                    }}
                    className="block w-full border-b editorial-rule p-3 text-left last:border-0 hover:bg-[#f7f7f5]"
                  >
                    <span className="block text-xs font-bold">
                      {match.displayName}
                    </span>
                    <span className="text-[11px] text-[#6d6d6d]">
                      @{match.username} · {match.locationCity}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {recipient && (
              <div className="mt-3 flex items-center justify-between border-l-2 border-[#5d43bb] bg-[#f7f7f5] p-3 text-xs">
                <span>
                  <b>{recipient.displayName}</b> · @{recipient.username} · {recipient.locationCity}
                </span>
                <button
                  type="button"
                  className="font-bold underline"
                  onClick={() => setRecipient(null)}
                >
                  change
                </button>
              </div>
            )}
            <label className="eyebrow mt-8 block">letter</label>
            <textarea
              className="field mt-3 min-h-64 resize-y leading-6"
              placeholder="Start writing..."
              maxLength={5000}
              value={content}
              onChange={(event) => setContent(event.target.value)}
              required
            />
            <div className="mt-2 flex justify-between text-[10px] text-[#6d6d6d]">
              <span>plain text only</span>
              <span>{content.length} / 5000</span>
            </div>
            {error && (
              <p className="mt-4 border-l-2 border-[#5d43bb] p-3 text-xs text-[#6d6d6d]">
                {error}
              </p>
            )}
            <div className="mt-7 lg:hidden">
              <StampPreview
                from={user?.location?.city}
                to={recipient?.locationCity}
                distanceKm={distanceKm}
              />
            </div>
            <button
              className="button-primary mt-7 w-full"
              disabled={busy || !recipient}
            >
              {busy ? "Dispatching" : "Dispatch letter"}{" "}
              <PaperPlaneTilt size={15} />
            </button>
          </form>
        </div>
      )}
    </AppShell>
  );
}
