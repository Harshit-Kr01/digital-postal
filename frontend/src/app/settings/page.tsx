"use client";

import React, { FormEvent, useEffect, useState } from "react";
import { ArrowUpRight, Compass, MapPin, Sparkle } from "@phosphor-icons/react";
import AppShell from "@/components/AppShell";
import StampPreview from "@/components/StampPreview";
import apiClient, { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import type { PostalLocation } from "@/types";

export default function SettingsPage() {
  const { user, updateLocation } = useAuth();
  const [locations, setLocations] = useState<PostalLocation[]>([]);
  const [locationId, setLocationId] = useState(user?.location?.id ?? "");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    apiClient
      .get<PostalLocation[]>("/locations")
      .then((res) => setLocations(res.data))
      .catch(() => setError("Locations could not be loaded."));
  }, []);

  const selectedLoc = locations.find((l) => l.id === locationId) || user?.location;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await updateLocation(locationId);
      setMessage("Your postal base location has been successfully updated.");
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="settings-page flex flex-col gap-8">
        {/* Studio Intro Header */}
        <div className="studio-stage-area">
          <section className="intro-block">
            <p className="eyebrow flex items-center gap-2">
              <span className="status-dot animate-pulse" />
              POSTAL PROFILE · SETTINGS
            </p>
            <h1>
              Set your origin.<br />
              <em>Where letters begin.</em>
            </h1>
            <p className="intro-copy">
              Your home postal location shapes all future letter delivery estimates.
              Dispatched letters already in transit will keep their existing route.
            </p>
          </section>

          {/* Stamp Preview of User's Origin City */}
          <div className="canvas-column">
            <div className="stamp-stage">
              <div className="stamp-stage-inner">
                <div className="stamp-art-wrapper">
                  <StampPreview
                    from={selectedLoc?.city || "New Delhi"}
                    to="Worldwide"
                    distanceKm={1200}
                  />
                </div>
              </div>
            </div>
            <div className="canvas-actions">
              <span className="font-mono text-xs uppercase tracking-wider text-[#6a6a64]">
                Postmark: {(selectedLoc?.city || "POSTAL").toUpperCase()} G.P.O.
              </span>
            </div>
          </div>

          {/* Profile Card */}
          <aside className="hidden xl:flex flex-col justify-between border border-[#e5e5e0] bg-[#fafaf9] p-6 rounded-2xl max-w-[320px]">
            <div>
              <div className="flex items-center justify-between border-b border-[#e5e5e0] pb-3">
                <span className="eyebrow !m-0">identity card</span>
                <span className="status-dot" />
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <span className="font-mono text-[10px] text-[#6a6a64] uppercase tracking-wider block">Full Name</span>
                  <span className="text-base font-semibold text-[#151515]">{user?.displayName}</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[#6a6a64] uppercase tracking-wider block">Username</span>
                  <span className="font-mono text-xs text-[#151515]">@{user?.username}</span>
                </div>
                <div>
                  <span className="font-mono text-[10px] text-[#6a6a64] uppercase tracking-wider block">Email</span>
                  <span className="text-xs text-[#151515]">{user?.email}</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#e5e5e0]">
              <span className="font-mono text-[10px] uppercase tracking-wider text-[#6a6a64]">
                MEMBER OF DIGITAL POSTAL
              </span>
            </div>
          </aside>
        </div>

        {/* Location Selection Form in Stampy styling */}
        <section className="border-t border-[#e5e5e0] pt-8 max-w-4xl">
          <div className="field-label-header mb-2">
            <span className="field-title text-xl font-bold">Postal Origin Location</span>
            <span className="field-sub">COORDINATES & TIME ZONE</span>
          </div>

          <form onSubmit={submit} className="mt-4 flex flex-col gap-6">
            <div className="border border-[#e5e5e0] bg-[#ffffff] p-6 rounded-2xl">
              <label className="block">
                <span className="font-mono text-xs uppercase tracking-wider text-[#6a6a64] block mb-2">
                  Select your home post office
                </span>
                <select
                  value={locationId}
                  onChange={(e) => setLocationId(e.target.value)}
                  required
                  className="w-full bg-[#f8f8f5] border border-[#e5e5e0] focus:border-[#151515] rounded-xl p-3.5 text-base outline-none transition-colors font-sans"
                >
                  <option value="">Choose a postal location...</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.city}, {loc.country} ({loc.countryCode})
                    </option>
                  ))}
                </select>
              </label>

              {selectedLoc && (
                <div className="mt-4 pt-4 border-t border-[#e5e5e0] grid grid-cols-2 sm:grid-cols-3 gap-4 font-mono text-xs">
                  <div>
                    <span className="text-[#6a6a64] block">City</span>
                    <span className="font-semibold text-[#151515]">{selectedLoc.city}</span>
                  </div>
                  <div>
                    <span className="text-[#6a6a64] block">Country</span>
                    <span className="font-semibold text-[#151515]">{selectedLoc.country}</span>
                  </div>
                  <div>
                    <span className="text-[#6a6a64] block">Code</span>
                    <span className="font-semibold text-[#ff5a1f]">{selectedLoc.countryCode}</span>
                  </div>
                </div>
              )}
            </div>

            {message && (
              <p className="p-4 bg-[#f2faf5] border-l-2 border-emerald-600 text-xs font-mono text-emerald-800">
                {message}
              </p>
            )}

            {error && (
              <p className="p-4 bg-[#fff0ed] border-l-2 border-[#ff5a1f] text-xs font-mono text-[#ff5a1f]">
                {error}
              </p>
            )}

            <div className="flex items-center justify-between gap-4">
              <p className="text-xs text-[#6a6a64]">
                Your home base serves as the point of departure for all outgoing correspondence.
              </p>
              <button
                type="submit"
                disabled={busy || !locationId}
                className="find-button !mt-0"
              >
                <span>{busy ? "Saving..." : "Save Location"}</span>
              </button>
            </div>
          </form>
        </section>
      </div>
    </AppShell>
  );
}
