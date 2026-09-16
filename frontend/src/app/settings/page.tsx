"use client";
import { FormEvent, useEffect, useState } from "react";
import AppShell from "@/components/AppShell";
import apiClient, { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PostalLocation } from "@/types";

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
      .then((response) => setLocations(response.data))
      .catch(() => setError("Locations could not be loaded."));
  }, []);
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await updateLocation(locationId);
      setMessage("Your postal location has been updated.");
    } catch (reason) {
      setError(getErrorMessage(reason));
    } finally {
      setBusy(false);
    }
  }

  return (
    <AppShell>
      <div className="max-w-2xl">
        <p className="eyebrow">account / profile</p>
        <h1 className="serif mt-4 text-6xl tracking-[-.055em]">
          Where should your letters land?
        </h1>
        <p className="mt-5 text-sm leading-6 text-[#6d6d6d]">
          Your location affects future delivery estimates. Existing letters keep
          the route they were sent with.
        </p>
        <div className="mt-12 border border-[#141414] bg-white p-6 md:p-8">
          <div className="border-b editorial-rule pb-6">
            <p className="eyebrow">account details</p>
            <p className="mt-3 text-sm font-bold">{user?.displayName}</p>
            <p className="mt-1 text-xs text-[#6d6d6d]">
              @{user?.username} · {user?.email}
            </p>
          </div>
          <form onSubmit={submit} className="pt-7">
            <label className="eyebrow block">current postal location</label>
            <select
              className="field mt-3"
              value={locationId}
              onChange={(event) => setLocationId(event.target.value)}
              required
            >
              <option value="">Select a postal location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.city}, {location.country}
                </option>
              ))}
            </select>
            {message && (
              <p className="mt-4 border-l-2 border-[#5d43bb] p-3 text-xs">
                {message}
              </p>
            )}
            {error && (
              <p className="mt-4 border-l-2 border-[#5d43bb] p-3 text-xs text-[#6d6d6d]">
                {error}
              </p>
            )}
            <button className="button-primary mt-7" disabled={busy}>
              {busy ? "Saving" : "Save location"}
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
