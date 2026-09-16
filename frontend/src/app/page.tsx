import Link from "next/link";
import {
  ArrowUpRight,
  EnvelopeSimple,
  MapPin,
  PaperPlaneTilt,
} from "@phosphor-icons/react/dist/ssr";
import StampPreview from "@/components/StampPreview";

export default function LandingPage() {
  return (
    <main className="landing-page editorial-shell px-5 py-5 md:px-10 md:py-8">
      <header className="mx-auto flex max-w-7xl items-center justify-between border-b editorial-rule pb-5">
        <Link
          href="/"
          className="flex items-center gap-3 text-sm font-bold tracking-tight"
        >
          <EnvelopeSimple size={20} weight="bold" /> digital postal
        </Link>
        <nav className="flex items-center gap-5 text-xs font-bold">
          <Link className="hidden sm:block hover:text-[#5d43bb]" href="/login">
            Sign in
          </Link>
          <Link className="button-primary py-2.5" href="/register">
            Join in <ArrowUpRight size={14} />
          </Link>
        </nav>
      </header>
      <section className="landing-hero mx-auto grid max-w-7xl gap-14 py-20 md:py-28 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
        <div className="reveal-up">
          <p className="eyebrow mb-7 flex items-center gap-2">
            <span className="status-dot" /> send something real
          </p>
          <h1 className="serif max-w-3xl text-6xl leading-[.95] tracking-[-.055em] sm:text-8xl">
            Say it. Send it. Let it take its time.
          </h1>
          <p className="mt-8 max-w-lg text-base leading-7 text-[#6d6d6d]">
            Find anyone by username. Write a note. Send it anywhere in the
            world.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link className="button-primary" href="/register">
              <PaperPlaneTilt size={16} /> Write a letter
            </Link>
            <Link className="button-secondary" href="/login">
              Sign in
            </Link>
          </div>
        </div>
        <div className="landing-visual reveal-up reveal-delay-2 relative flex min-h-[530px] items-center justify-center overflow-hidden px-3 py-12">
          <div className="pointer-events-none absolute right-1 top-2 h-56 w-64 rounded-t-[9rem] border border-[#9d3434] bg-[#c84c4c] opacity-90 shadow-[18px_20px_0_rgba(20,20,20,.06)] sm:right-8">
            <div className="absolute -bottom-28 left-1/2 h-32 w-5 -translate-x-1/2 bg-[#9d3434]" />
            <div className="absolute left-1/2 top-12 h-3 w-28 -translate-x-1/2 rounded-full bg-[#9d3434]" />
            <div className="absolute bottom-4 left-5 right-5 border-t border-[#e98a82] pt-3 text-center text-[9px] font-bold uppercase tracking-[.2em] text-[#f7c1b9]">
              post / 01
            </div>
          </div>
          <div className="floating-letter relative z-10 w-full max-w-md border border-[#141414] bg-white p-6 shadow-[10px_12px_0_rgba(20,20,20,.08)] md:p-8">
            <div className="flex items-start justify-between border-b editorial-rule pb-6">
              <div>
                <p className="eyebrow">a letter for you</p>
                <p className="mt-2 text-sm font-bold">On its way</p>
              </div>
              <div className="translate-x-1 -translate-y-1">
              <StampPreview from="Delhi" to="Muzaffarpur" distanceKm={1080} compact />
              </div>
            </div>
            <div className="py-10">
              <div className="flex items-center justify-between text-xs font-bold">
                <span>Delhi</span>
                <span className="text-[#6d6d6d]">1,080 km apart</span>
                <span>Muzaffarpur</span>
              </div>
              <div className="relative my-7 h-px bg-[#141414]">
                <span className="route-marker absolute left-[48%] top-[-4px] h-2 w-2 bg-[#5d43bb]" />
              </div>
              <div className="flex items-center justify-between text-[10px] uppercase tracking-[.14em] text-[#6d6d6d]">
                <span className="flex items-center gap-2">
                  <MapPin size={13} /> from
                </span>
                <span>on its way</span>
                <span>to</span>
              </div>
            </div>
            <div className="flex justify-between border-t editorial-rule pt-5 text-[10px] uppercase tracking-[.12em] text-[#6d6d6d]">
              <span>sealed</span>
              <span>arrives tomorrow</span>
            </div>
          </div>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl justify-between border-t editorial-rule pt-4 text-[10px] font-bold uppercase tracking-[.14em] text-[#6d6d6d]">
        <span>Digital Postal</span>
        <span>Letters, with time in them.</span>
      </footer>
    </main>
  );
}
