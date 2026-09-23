"use client";
/* eslint-disable @next/next/no-img-element */

import React, { useEffect, useMemo, useState } from "react";
import { EnvelopeSimple } from "@phosphor-icons/react";

const STAMP_API_URL =
  process.env.NEXT_PUBLIC_STAMP_API_URL ||
  "https://stampyyy.vercel.app/api/stamp";

// Cache sanitized SVG strings in memory so we don't re-fetch identical routes
const svgCache = new Map<string, string>();

export const STAMP_THEMES = [
  "prussian-blue",
  "carmine-rose",
  "veronese-green",
  "penny-black",
  "burnt-sienna",
  "tyrian-violet",
  "nordic-slate",
  "sepia-bistre",
] as const;

export const STAMP_MOTIFS = [
  "waves",
  "concentric",
  "sunburst",
  "bauhaus",
  "topography",
  "crest",
  "compass",
  "halftone",
] as const;

export const STAMP_BORDERS = [
  "classic-double",
  "ornate",
  "dashed",
  "single",
  "minimal",
] as const;

export type StampTheme = (typeof STAMP_THEMES)[number];
export type StampMotif = (typeof STAMP_MOTIFS)[number];
export type StampBorder = (typeof STAMP_BORDERS)[number];

export function getDeterministicStampStyle(seed: string): {
  theme: StampTheme;
  motif: StampMotif;
  border: StampBorder;
} {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = (hash << 5) - hash + seed.charCodeAt(i);
    hash |= 0;
  }
  const abs = Math.abs(hash);
  return {
    theme: STAMP_THEMES[abs % STAMP_THEMES.length],
    motif: STAMP_MOTIFS[Math.floor(abs / 7) % STAMP_MOTIFS.length],
    border: STAMP_BORDERS[Math.floor(abs / 13) % STAMP_BORDERS.length],
  };
}

function denominationForDistance(distanceKm?: number): string {
  if (distanceKm == null || distanceKm <= 250) return "10";
  if (distanceKm <= 1000) return "25";
  if (distanceKm <= 3000) return "50";
  return "80";
}

function stripCurrencySymbols(rawSvg: string): string {
  return rawSvg
    // Replace e.g. ">₹25</text>" or ">$10</text>" with ">25</text>"
    .replace(/>\s*(?:[₹$¢£¥€]|&#8377;|&euro;|&pound;|&yen;|&cent;)\s*([0-9]+)\s*</gi, ">$1<")
    // Catch any remaining currency symbols preceding digits
    .replace(/(?:[₹$¢£¥€]|&#8377;|&euro;|&pound;|&yen;|&cent;)\s*([0-9]+)/gi, "$1");
}

export interface StampPreviewProps {
  from?: string;
  to?: string;
  distanceKm?: number;
  compact?: boolean;
  className?: string;
  theme?: StampTheme | string;
  motif?: StampMotif | string;
  border?: StampBorder | string;
  seed?: string;
  title?: string;
  year?: string;
}

export default function StampPreview({
  from,
  to,
  distanceKm,
  compact = false,
  className = "",
  theme,
  motif,
  border,
  seed,
  title,
  year,
}: StampPreviewProps) {
  const [dataUrl, setDataUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const digitDenom = denominationForDistance(distanceKm);

  const resolvedStyle = useMemo(() => {
    if (theme || motif || border) {
      return {
        theme,
        motif,
        border,
      };
    }
    if (seed) {
      return getDeterministicStampStyle(seed);
    }
    return null;
  }, [theme, motif, border, seed]);

  const requestUrl = useMemo(() => {
    if (!from || !to) return "";
    const params = new URLSearchParams({
      from,
      to,
      code: from.replace(/[^a-zA-Z]/g, "").slice(0, 2).toUpperCase() || "DP",
      denom: `₹${digitDenom}`,
      ...(distanceKm != null ? { distance: String(distanceKm) } : {}),
      format: "svg",
      postmark: "1",
      width: compact ? "180" : "300",
    });

    if (resolvedStyle?.theme) params.set("theme", resolvedStyle.theme);
    if (resolvedStyle?.motif) params.set("motif", resolvedStyle.motif);
    if (resolvedStyle?.border) params.set("border", resolvedStyle.border);
    if (title) params.set("title", title);
    if (year) params.set("year", year);

    return `${STAMP_API_URL}?${params.toString()}`;
  }, [from, to, distanceKm, compact, digitDenom, resolvedStyle, title, year]);

  useEffect(() => {
    if (!requestUrl) {
      return;
    }

    let isCancelled = false;

    void Promise.resolve().then(() => {
      if (isCancelled) return;

      if (svgCache.has(requestUrl)) {
        setDataUrl(svgCache.get(requestUrl)!);
        setLoading(false);
        return;
      }

      setLoading(true);

      fetch(requestUrl)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.text();
        })
        .then((rawSvg) => {
          if (isCancelled) return;
          // Strip any currency symbols from the SVG output so it displays strictly digits
          const cleanSvg = stripCurrencySymbols(rawSvg);
          const encoded = `data:image/svg+xml;utf8,${encodeURIComponent(cleanSvg)}`;
          svgCache.set(requestUrl, encoded);
          setDataUrl(encoded);
        })
        .catch((err) => {
          if (!isCancelled) {
            console.warn("Could not load stamp SVG:", err);
            // Fallback to direct URL if fetch fails
            setDataUrl(requestUrl.replace("format=svg", "format=png"));
          }
        })
        .finally(() => {
          if (!isCancelled) setLoading(false);
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [requestUrl]);

  if (compact) {
    if (!from || !to) return null;
    return (
      <div className={`stamp-art stamp-shadow inline-block ${className}`}>
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`Postage stamp for route ${from} to ${to}`}
            className="h-24 w-auto object-contain block select-none"
            loading="lazy"
          />
        ) : (
          <div className="h-24 w-18 border border-[#e5e5e0] bg-[#f8f8f5] rounded animate-pulse" />
        )}
      </div>
    );
  }

  return (
    <div className={`stamp-art-wrapper ${className}`}>
      {dataUrl ? (
        <div className="stamp-art stamp-shadow">
          <img
            src={dataUrl}
            alt={`Postage stamp for route ${from} to ${to}`}
            className="w-48 sm:w-56 h-auto object-contain block select-none"
          />
        </div>
      ) : (
        <div className="w-48 sm:w-56 h-64 border border-dashed border-[#e5e5e0] rounded-xl flex flex-col items-center justify-center p-4 text-center bg-[#f8f8f5]">
          <EnvelopeSimple size={24} className="text-[#6a6a64] mb-2" weight="thin" />
          <p className="font-mono text-[11px] uppercase tracking-wider text-[#6a6a64]">
            {loading ? "Rendering stamp..." : "Stamp will generate upon route selection"}
          </p>
        </div>
      )}
    </div>
  );
}
