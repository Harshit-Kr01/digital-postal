"use client";
/* eslint-disable @next/next/no-img-element */

import { useMemo } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";

const STAMP_API_URL =
  process.env.NEXT_PUBLIC_STAMP_API_URL ||
  "https://stampyyy.vercel.app/api/stamp";

export default function StampPreview({
  from,
  to,
  compact = false,
}: {
  from?: string;
  to?: string;
  compact?: boolean;
}) {
  const imageUrl = useMemo(() => {
    if (!from || !to) return "";
    const params = new URLSearchParams({
      from,
      to,
      format: "png",
      postmark: "1",
      width: "420",
    });
    return `${STAMP_API_URL}?${params.toString()}`;
  }, [from, to]);

  if (compact)
    return imageUrl ? (
      <img
        src={imageUrl}
        alt={`Stamp from ${from} to ${to}`}
        className="h-20 w-14 object-contain"
      />
    ) : null;
  return (
    <aside className="border border-[#141414] bg-white p-5 md:p-6">
      <div className="flex items-center justify-between border-b editorial-rule pb-4">
        <div>
          <p className="eyebrow">live stamp / stampyyy</p>
          <p className="mt-2 text-xs font-bold">Your route, rendered</p>
        </div>
        <EnvelopeSimple size={20} className="text-[#5d43bb]" />
      </div>
      <div className="flex min-h-72 items-center justify-center bg-[#f7f7f5] py-7">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={`Stamp from ${from} to ${to}`}
            className="h-64 w-48 object-contain"
          />
        ) : (
          <p className="px-8 text-center text-xs leading-5 text-[#6d6d6d]">
            Choose a recipient to generate a route stamp.
          </p>
        )}
      </div>
      <div className="flex justify-between border-t editorial-rule pt-4 text-[10px] uppercase tracking-[.12em] text-[#6d6d6d]">
        <span>{from || "origin"}</span>
        <span>{to || "destination"}</span>
      </div>
    </aside>
  );
}
