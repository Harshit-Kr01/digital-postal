"use client";

import React, { FormEvent, useEffect, useState } from "react";
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
      <div className="settings-page max-w-3xl mx-auto w-full flex flex-col gap-6 py-2">
        {/* Page Header */}
        <div className="pb-4 border-b border-[#e5e5e0]">
          <span className="eyebrow !m-0">ACCOUNT & POSTAL BASE</span>
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#151515] mt-1">
            Settings
          </h1>
        </div>

        {/* Profile Snapshot Card */}
        <div className="p-4 sm:p-5 border border-[#e5e5e0] bg-[#fafaf9] rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#151515] text-[#ffffff] font-bold text-sm flex items-center justify-center shrink-0">
              {user?.displayName ? user.displayName[0].toUpperCase() : "U"}
            </div>
            <div>
              <p className="font-semibold text-sm text-[#151515]">{user?.displayName}</p>
              <p className="font-mono text-xs text-[#6a6a64]">@{user?.username} · {user?.email}</p>
            </div>
          </div>

          <div className="font-mono text-xs text-[#6a6a64] flex items-center gap-2 self-start sm:self-center">
            <span className="status-dot" />
            <span>Current Base: <strong className="text-[#151515]">{user?.location?.city || "Not set"}</strong></span>
          </div>
        </div>

        {/* Postal Base Selection Form */}
        <form onSubmit={submit} className="border border-[#e5e5e0] bg-[#ffffff] p-5 sm:p-8 rounded-2xl shadow-xs flex flex-col gap-6">
          <div>
            <span className="eyebrow block mb-1">home post office</span>
            <h2 className="text-lg font-semibold text-[#151515]">
              Postal Origin Location
            </h2>
            <p className="text-xs text-[#6a6a64] mt-1">
              Your home post office sets departure coordinates and delivery calculations for outgoing mail.
            </p>
          </div>

          <div>
            <label className="block">
              <span className="font-mono text-xs uppercase tracking-wider text-[#6a6a64] block mb-2">
                Select your post office
              </span>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                required
                className="w-full bg-[#f8f8f5] border border-[#e5e5e0] focus:border-[#151515] rounded-xl p-3 text-sm sm:text-base outline-none transition-colors font-sans"
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
              <div className="mt-4 p-4 bg-[#f8f8f5] border border-[#e5e5e0] rounded-xl flex items-center justify-between gap-4">
                <div className="grid grid-cols-3 gap-3 font-mono text-xs flex-1">
                  <div>
                    <span className="text-[#6a6a64] block text-[10px] uppercase">City</span>
                    <span className="font-semibold text-[#151515] text-sm">{selectedLoc.city}</span>
                  </div>
                  <div>
                    <span className="text-[#6a6a64] block text-[10px] uppercase">Country</span>
                    <span className="font-semibold text-[#151515] text-sm">{selectedLoc.country}</span>
                  </div>
                  <div>
                    <span className="text-[#6a6a64] block text-[10px] uppercase">Code</span>
                    <span className="font-semibold text-[#ff5a1f] text-sm">{selectedLoc.countryCode}</span>
                  </div>
                </div>

                <div className="shrink-0 hidden sm:block">
                  <StampPreview
                    from={selectedLoc.city}
                    to="Worldwide"
                    distanceKm={1200}
                    compact
                  />
                </div>
              </div>
            )}
          </div>

          {message && (
            <p className="p-3 bg-[#f2faf5] border-l-2 border-emerald-600 text-xs font-mono text-emerald-800">
              {message}
            </p>
          )}

          {error && (
            <p className="p-3 bg-[#fff0ed] border-l-2 border-[#ff5a1f] text-xs font-mono text-[#ff5a1f]">
              {error}
            </p>
          )}

          <div className="pt-4 border-t border-[#e5e5e0] flex items-center justify-end">
            <button
              type="submit"
              disabled={busy || !locationId}
              className="h-11 px-6 rounded-full bg-[#151515] text-[#ffffff] hover:bg-[#ff5a1f] transition-all inline-flex items-center justify-center font-mono text-xs font-semibold uppercase tracking-wider w-full sm:w-auto shadow-xs cursor-pointer active:scale-95 disabled:opacity-60"
            >
              <span>{busy ? "Saving..." : "Save Location"}</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
