"use client";
import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight } from "@phosphor-icons/react";
import apiClient, { getErrorMessage } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { PostalLocation } from "@/types";

export default function AuthForm({ mode }: { mode: "login" | "register" }) {
  const router = useRouter();
  const { login, register } = useAuth();
  const [error, setError] = useState("");
  const [locationsError, setLocationsError] = useState("");
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
    if (mode === "register")
      apiClient
        .get<PostalLocation[]>("/locations")
        .then((r) => setLocations(r.data))
        .catch((reason) => setLocationsError(getErrorMessage(reason)));
  }, [mode]);
  const change =
    (key: keyof typeof form) =>
    (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm({ ...form, [key]: e.target.value });
  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (mode === "login")
        await login({
          usernameOrEmail: form.usernameOrEmail,
          password: form.password,
        });
      else
        await register({
          username: form.username,
          displayName: form.displayName,
          email: form.email,
          password: form.password,
          locationId: form.locationId,
        });
      router.push("/dashboard");
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="editorial-shell grid min-h-screen place-items-center px-5 py-10">
      <div className="w-full max-w-md">
        <Link
          href="/"
          className="mb-12 inline-flex items-center gap-2 text-xs font-bold"
        >
          <ArrowLeft size={15} /> digital postal
        </Link>
        <p className="eyebrow">
          {mode === "login" ? "returning mail" : "new account"}
        </p>
        <h1 className="serif mt-4 text-5xl tracking-[-.045em]">
          {mode === "login" ? "Welcome back." : "Open your mailbox."}
        </h1>
        <p className="mt-4 text-sm leading-6 text-[#6d6d6d]">
          {mode === "login"
            ? "Your letters are waiting where you left them."
            : "Choose a home postal location. It will shape how your letters travel."}
        </p>
        <form onSubmit={submit} className="mt-9 space-y-4">
          {mode === "register" && (
            <>
              <label className="block">
                <span className="eyebrow mb-2 block">display name</span>
                <input
                  className="field"
                  value={form.displayName}
                  onChange={change("displayName")}
                  required
                />
              </label>
              <label className="block">
                <span className="eyebrow mb-2 block">username</span>
                <input
                  className="field"
                  value={form.username}
                  onChange={change("username")}
                  required
                  minLength={2}
                />
              </label>
              <label className="block">
                <span className="eyebrow mb-2 block">email</span>
                <input
                  className="field"
                  type="email"
                  value={form.email}
                  onChange={change("email")}
                  required
                />
              </label>
              <label className="block">
                <span className="eyebrow mb-2 block">home location</span>
                <select
                  className="field"
                  value={form.locationId}
                  onChange={change("locationId")}
                  required
                  disabled={!!locationsError}
                >
                  <option value="">
                    {locationsError
                      ? "Locations unavailable"
                      : locations.length
                        ? "Select a postal location"
                        : "Loading locations..."}
                  </option>
                  {locations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.city}, {location.country}
                    </option>
                  ))}
                </select>
                {locationsError && (
                  <p className="mt-2 text-xs text-[#6d6d6d]">
                    {locationsError} Check that the backend is running on port
                    5271.
                  </p>
                )}
              </label>
            </>
          )}
          {mode === "login" && (
            <label className="block">
              <span className="eyebrow mb-2 block">username or email</span>
              <input
                className="field"
                value={form.usernameOrEmail}
                onChange={change("usernameOrEmail")}
                required
              />
            </label>
          )}
          <label className="block">
            <span className="eyebrow mb-2 block">password</span>
            <input
              className="field"
              type="password"
              value={form.password}
              onChange={change("password")}
              required
              minLength={8}
            />
          </label>
          {error && (
            <p className="border-l-2 border-[#5d43bb] bg-white p-3 text-xs text-[#6d6d6d]">
              {error}
            </p>
          )}
          <button className="button-primary w-full" disabled={busy}>
            {busy
              ? "Please wait"
              : mode === "login"
                ? "Enter mailbox"
                : "Create mailbox"}{" "}
            <ArrowRight size={15} />
          </button>
        </form>
        <p className="mt-8 text-center text-xs text-[#6d6d6d]">
          {mode === "login" ? (
            <>
              New here?{" "}
              <Link
                className="font-bold text-[#141414] underline"
                href="/register"
              >
                Create an account
              </Link>
            </>
          ) : (
            <>
              Already have a mailbox?{" "}
              <Link
                className="font-bold text-[#141414] underline"
                href="/login"
              >
                Sign in
              </Link>
            </>
          )}
        </p>
      </div>
    </main>
  );
}
