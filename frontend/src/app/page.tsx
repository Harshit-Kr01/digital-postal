import Link from "next/link";
import {
  ArrowUpRight,
  MapPin,
  PaperPlaneTilt,
} from "@phosphor-icons/react/dist/ssr";
import StampPreview from "@/components/StampPreview";

export default function LandingPage() {
  return (
    <div className="stampy-app min-h-screen flex flex-col bg-[#ffffff] text-[#151515]">
      {/* Site Header */}
      <header className="site-header">
        <div className="site-header-inner">
          <Link href="/" className="wordmark">
            digital postal<span>.</span>
          </Link>

          <nav className="site-nav">
            <Link href="/login" className="header-action-btn hidden sm:inline-flex">
              sign in
            </Link>
            <Link href="/register" className="nav-cta">
              <span>join in</span>
              <ArrowUpRight size={13} weight="bold" />
            </Link>
          </nav>
        </div>
      </header>

      {/* Minimal Editorial Marketing Hero */}
      <main className="studio-main flex-1 flex flex-col justify-between">
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center my-auto py-10 lg:py-16">
          {/* Left Column: Editorial Copy */}
          <div className="lg:col-span-7 max-w-xl">
            <p className="eyebrow flex items-center gap-2 mb-6">
              <span className="status-dot" />
              <span>send something real</span>
            </p>

            <h1 className="text-5xl sm:text-7xl lg:text-8xl font-medium tracking-[-0.05em] leading-[0.96] text-[#151515]">
              Say it. Send it.<br />
              <em className="font-serif italic font-normal">Let it take its time.</em>
            </h1>

            <p className="mt-8 text-base text-[#6a6a64] leading-relaxed max-w-lg">
              Find anyone by username. Write a note. Send it anywhere in the world.
              Letters travel at the speed of real physical distance.
            </p>

            <div className="mt-9 flex flex-wrap items-center gap-3">
              <Link href="/register" className="find-button !mt-0">
                <PaperPlaneTilt size={15} weight="bold" />
                <span>Write a letter</span>
                <small>↗</small>
              </Link>
              <Link href="/login" className="header-action-btn !py-3.5 !px-5 !text-[12px]">
                Sign in
              </Link>
            </div>
          </div>

          {/* Right Column: Floating Letter Envelope */}
          <div className="lg:col-span-5 flex justify-center lg:justify-end">
            <div className="w-full max-w-[420px] border border-[#151515] bg-[#ffffff] p-7 sm:p-8 rounded-2xl shadow-[12px_14px_0_rgba(20,20,20,0.06)]">
              {/* Top Row: Notice & Compact Stamp in upper right */}
              <div className="flex items-start justify-between border-b border-[#e5e5e0] pb-5">
                <div>
                  <p className="eyebrow !m-0">a letter for you</p>
                  <p className="text-base font-bold text-[#151515] mt-1.5">On its way</p>
                </div>
                <div className="-mt-1 -mr-1">
                  <StampPreview from="Delhi" to="Muzaffarpur" distanceKm={1080} compact />
                </div>
              </div>

              {/* Middle: Route & Distance */}
              <div className="py-8">
                <div className="flex items-center justify-between font-mono text-xs font-bold text-[#151515]">
                  <span>Delhi</span>
                  <span className="text-[#6a6a64] font-normal">1,080 km apart</span>
                  <span>Muzaffarpur</span>
                </div>

                <div className="relative my-6 h-[2px] bg-[#151515] w-full">
                  <span className="absolute left-[48%] top-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 bg-[#ff5a1f] shadow-[0_0_0_4px_rgba(255,90,31,0.2)] animate-pulse" />
                </div>

                <div className="flex items-center justify-between font-mono text-[10px] uppercase tracking-wider text-[#6a6a64]">
                  <span className="flex items-center gap-1.5">
                    <MapPin size={13} className="text-[#ff5a1f]" weight="fill" />
                    <span>from</span>
                  </span>
                  <span>on its way</span>
                  <span>to</span>
                </div>
              </div>

              {/* Bottom: Sealed Status */}
              <div className="flex items-center justify-between border-t border-[#e5e5e0] pt-4 font-mono text-[11px] uppercase tracking-wider text-[#6a6a64]">
                <span>sealed</span>
                <span>arrives tomorrow</span>
              </div>
            </div>
          </div>
        </section>

        {/* Minimal Studio Footer */}
        <footer className="studio-footer">
          <span>DIGITAL POSTAL / 2026</span>
          <span>LETTERS, WITH TIME IN THEM.</span>
        </footer>
      </main>
    </div>
  );
}
