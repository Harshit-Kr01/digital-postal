"use client";
import Link from "next/link";
import {
  ArrowUpRight,
  Compass,
  EnvelopeSimple,
  MapPin,
  PaperPlaneTilt,
} from "@phosphor-icons/react";
import AppShell from "@/components/AppShell";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user } = useAuth();
  return (
    <AppShell>
      <div className="flex flex-col justify-between gap-8 border-b editorial-rule pb-10 md:flex-row md:items-end">
        <div>
          <p className="eyebrow">your postal desk</p>
          <h1 className="serif mt-4 text-6xl tracking-[-.055em]">
            Good morning, {user?.displayName.split(" ")[0]}.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-[#6d6d6d]">
            Your mailbox is ready. Send a letter and the distance between two
            places will set its pace.
          </p>
        </div>
        <Link className="button-primary" href="/compose">
          <PaperPlaneTilt size={16} /> Write a letter
        </Link>
      </div>
      <section className="grid gap-px bg-[#d9d9d5] md:grid-cols-3">
        <div className="bg-[#f7f7f5] p-7">
          <Compass size={22} className="text-[#5d43bb]" />
          <p className="eyebrow mt-12">home location</p>
          <p className="mt-2 text-xl font-bold">{user?.location?.city}</p>
          <p className="mt-1 text-xs text-[#6d6d6d]">
            {user?.location?.country}
          </p>
        </div>
        <div className="bg-[#f7f7f5] p-7">
          <EnvelopeSimple size={22} className="text-[#5d43bb]" />
          <p className="eyebrow mt-12">in transit</p>
          <p className="mt-2 text-xl font-bold">No letters yet</p>
          <p className="mt-1 text-xs text-[#6d6d6d]">
            Incoming mailbox arrives with the next backend milestone.
          </p>
        </div>
        <div className="bg-[#f7f7f5] p-7">
          <MapPin size={22} className="text-[#5d43bb]" />
          <p className="eyebrow mt-12">system status</p>
          <p className="mt-2 text-xl font-bold">Dispatch ready</p>
          <p className="mt-1 text-xs text-[#6d6d6d]">
            Auth, locations, recipients, and dispatch are connected.
          </p>
        </div>
      </section>
      <section className="mt-16 flex items-center justify-between border-t editorial-rule pt-5">
        <div>
          <p className="eyebrow">next step</p>
          <p className="mt-2 text-sm font-bold">
            Choose a recipient and start a real journey.
          </p>
        </div>
        <Link
          href="/compose"
          className="flex items-center gap-2 text-xs font-bold underline"
        >
          Compose <ArrowUpRight size={14} />
        </Link>
      </section>
    </AppShell>
  );
}
