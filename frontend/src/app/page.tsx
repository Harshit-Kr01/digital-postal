'use client';

import Link from 'next/link';
import {
  PaperPlaneTilt,
  SealCheck,
  MapPin,
  AirplaneTakeoff,
  Compass,
  EnvelopeSimple,
  ClockAfternoon,
  Plant,
} from '@phosphor-icons/react';

export default function LandingPage() {
  return (
    <div className="h-screen w-full bg-[#F7F4EE] text-stone-800 flex flex-col justify-between p-6 md:p-10 overflow-hidden select-none font-sans">
      <header className="flex items-center justify-between max-w-6xl w-full mx-auto">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-[#EBE4D8] border border-[#DCD3C4] flex items-center justify-center text-stone-700">
            <EnvelopeSimple size={18} weight="bold" />
          </div>
          <span className="font-serif tracking-tight text-base font-semibold text-stone-900">
            Digital Postal
          </span>
        </div>

        <nav className="flex items-center gap-2">
          <Link
            href="/login"
            className="text-xs font-medium text-stone-600 hover:text-stone-900 px-3 py-1.5 rounded-md hover:bg-[#ECE5D9] transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-xs font-medium bg-stone-900 hover:bg-stone-800 text-stone-50 px-3.5 py-1.5 rounded-md shadow-xs transition-colors"
          >
            Open Mailbox
          </Link>
        </nav>
      </header>

      <main className="max-w-6xl w-full mx-auto my-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-5 flex flex-col items-start text-left">
          <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-wider text-amber-900/80 bg-[#EFE8DC] px-2.5 py-1 rounded border border-[#DFD6C7] mb-4">
            <AirplaneTakeoff size={14} weight="bold" />
            <span>Simulated Airmail & Dispatch</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-serif text-stone-900 tracking-tight leading-[1.12]">
            Words that take time to travel.
          </h1>

          <p className="mt-3.5 text-xs sm:text-sm text-stone-600 leading-relaxed max-w-md">
            Digital Postal connects people without instant notifications. Letters travel
            across real geographical distances, arriving in hours or days with postal stamps
            and journey histories.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <Link
              href="/register"
              className="px-4 py-2.5 rounded-md bg-[#8C3A27] hover:bg-[#783121] text-white text-xs font-medium flex items-center gap-2 shadow-xs transition-colors"
            >
              <PaperPlaneTilt size={15} weight="bold" />
              Write a Letter
            </Link>
            <Link
              href="/login"
              className="px-4 py-2.5 rounded-md bg-[#FAF8F3] hover:bg-[#F2ECE0] border border-[#D8CEBE] text-stone-700 text-xs font-medium transition-colors"
            >
              Check Incoming Mail
            </Link>
          </div>

          <div className="mt-8 pt-4 border-t border-[#E5DCCE] flex items-center gap-6 text-stone-500 text-[11px] font-mono">
            <div className="flex items-center gap-1.5">
              <Compass size={13} className="text-stone-600" />
              <span>Real Distance Routing</span>
            </div>
            <div className="flex items-center gap-1.5">
              <ClockAfternoon size={13} className="text-stone-600" />
              <span>Discrete Timestamps</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 flex justify-center items-center">
          <div className="relative w-full max-w-md bg-[#FCFBF8] border border-[#DDD3C2] rounded-lg shadow-sm p-6 sm:p-7 flex flex-col justify-between">
            <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-lg bg-[repeating-linear-gradient(45deg,#8C3A27,#8C3A27_10px,#FCFBF8_10px,#FCFBF8_14px,#2E4A62_14px,#2E4A62_24px,#FCFBF8_24px,#FCFBF8_28px)] opacity-60" />

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <div className="w-14 h-14 rounded-full border border-dashed border-stone-400 flex flex-col items-center justify-center text-[8px] font-mono text-stone-500 uppercase tracking-widest leading-none rotate-[-6deg]">
                  <span className="font-semibold text-stone-600">DELHI HUB</span>
                  <span className="my-0.5 text-[7px] text-stone-400">01 SEP 2026</span>
                  <span>DISPATCHED</span>
                </div>
                <div className="hidden sm:flex flex-col gap-0.5 text-stone-300">
                  <div className="w-8 h-[1px] bg-stone-300" />
                  <div className="w-10 h-[1px] bg-stone-300" />
                  <div className="w-7 h-[1px] bg-stone-300" />
                </div>
              </div>

              <div className="relative rotate-[2deg] shadow-xs">
                <div className="w-[84px] h-[100px] bg-[#EFE9DC] border border-[#D5CBB8] p-1.5 relative overflow-hidden flex flex-col items-center justify-between">
                  <div className="absolute -top-1 left-0 right-0 flex justify-around">
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-b border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-b border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-b border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-b border-[#D5CBB8]" />
                  </div>

                  <div className="absolute -bottom-1 left-0 right-0 flex justify-around">
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-t border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-t border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-t border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-t border-[#D5CBB8]" />
                  </div>

                  <div className="absolute top-0 bottom-0 -left-1 flex flex-col justify-around">
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-r border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-r border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-r border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-r border-[#D5CBB8]" />
                  </div>

                  <div className="absolute top-0 bottom-0 -right-1 flex flex-col justify-around">
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-l border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-l border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-l border-[#D5CBB8]" />
                    <span className="w-2 h-2 rounded-full bg-[#FCFBF8] border-l border-[#D5CBB8]" />
                  </div>

                  <div className="w-full h-full border border-[#D5CBB8]/70 bg-[#FAF7F0] p-1.5 flex flex-col items-center justify-between text-center">
                    <span className="text-[7px] font-mono tracking-widest text-stone-500 uppercase">
                      POSTAGE
                    </span>

                    <div className="w-8 h-8 rounded-full bg-[#EAE2D2] flex items-center justify-center text-[#8C3A27]">
                      <Plant size={18} weight="duotone" />
                    </div>

                    <span className="text-[7px] font-serif italic text-stone-600">
                      Shahi Series
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="my-5 p-3 rounded bg-[#F4EFE6] border border-[#E0D5C3] flex items-center justify-between text-xs">
              <div className="flex items-center gap-2 text-stone-700 font-mono text-[11px]">
                <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                <span>IN TRANSIT • 1,080 KM</span>
              </div>
              <span className="font-mono text-[11px] text-stone-500">
                Arriving in 18 hours
              </span>
            </div>

            <div className="font-serif space-y-1 text-stone-700 pl-4 border-l-2 border-amber-900/20">
              <p className="text-[11px] font-mono uppercase tracking-widest text-stone-400">
                Deliver to:
              </p>
              <p className="text-sm font-semibold text-stone-900">Harshit K.</p>
              <p className="text-xs text-stone-600 flex items-center gap-1">
                <MapPin size={12} className="text-stone-400" />
                Muzaffarpur, Bihar, India
              </p>
            </div>

            <div className="mt-5 pt-3 border-t border-[#EFE8DB] flex items-center justify-between text-[10px] font-mono text-stone-400">
              <span className="flex items-center gap-1">
                <SealCheck size={12} className="text-stone-500" /> Sealed Envelope
              </span>
              <span>Content hidden until delivery</span>
            </div>
          </div>
        </div>
      </main>

      <footer className="max-w-6xl w-full mx-auto flex items-center justify-between text-[11px] font-mono text-stone-400 border-t border-[#E8DFD0] pt-3">
        <span>EST. 2026</span>
        <span>POSTAL SIMULATION SYSTEM</span>
      </footer>
    </div>
  );
}
