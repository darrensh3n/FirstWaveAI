import Link from "next/link"

import { Button } from "@/components/ui/button"
import { CONSOLE_HREF, DEMO_URL } from "./links"

/** Thin concentric cyan rings behind the hero, top-right (~15% opacity). */
function HeroRings() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 900 900"
      fill="none"
      className="pointer-events-none absolute top-[-420px] left-[calc(50%+40px)] size-[900px] text-primary opacity-15 lg:top-[-330px] lg:left-[calc(50%-50px)]"
    >
      {[130, 230, 330, 430].map((r, i) => (
        <circle key={r} cx="450" cy="450" r={r} stroke="currentColor" strokeWidth={i === 0 ? 2 : 1.25} />
      ))}
    </svg>
  )
}

function FactChip({ label, value }: { label: string; value: string }) {
  return (
    <li className="rounded-full bg-card-raised px-3 py-1.5 text-[13px] leading-tight">
      <span className="text-muted-foreground">{label}</span> <span className="text-foreground">{value}</span>
    </li>
  )
}

function SampleCallCard() {
  return (
    <figure
      aria-label="Sample call: FirstWave structures a caller's report into a P1 recommendation"
      className="relative rounded-card border border-border bg-card p-5 shadow-elevated sm:p-6"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2.5 font-mono text-[12px] font-medium tracking-[0.12em] text-foreground">
          <span aria-hidden="true" className="size-2 animate-pulse-dot rounded-full bg-danger" />
          INCOMING CALL · 00:42
        </p>
        <span className="text-[12px] text-muted-foreground">Sample call</span>
      </div>

      <div className="mt-5 space-y-4">
        <div className="max-w-[92%] rounded-[12px] bg-card-raised px-4 py-3 sm:max-w-[85%]">
          <p className="font-mono text-[11px] tracking-[0.08em] text-muted-foreground">CALLER</p>
          <p className="mt-1 text-[15px] leading-snug text-foreground">
            There was a crash. My dad is not waking up. We&apos;re on Market near Fifth.
          </p>
        </div>
        <div className="ml-auto w-fit max-w-[92%] rounded-[12px] border border-primary/35 bg-primary-soft px-4 py-3 sm:max-w-[85%]">
          <p className="font-mono text-[11px] tracking-[0.08em] text-primary">FIRSTWAVE</p>
          <p className="mt-1 text-[15px] leading-snug text-foreground">Stay with me. Is he breathing right now?</p>
        </div>
      </div>

      <hr className="my-5 border-border" />

      <ul className="flex flex-wrap gap-2" aria-label="Extracted facts">
        <FactChip label="Location" value="Market St & 5th" />
        <FactChip label="Injury" value="Unresponsive adult" />
        <FactChip label="Still missing" value="Breathing, hazards" />
      </ul>

      <div className="mt-5 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-tile border border-p1/30 bg-p1/8 px-4 py-3">
        <span className="font-display text-[32px] font-bold leading-none tracking-[-0.02em] text-p1">P1</span>
        <p className="text-[14px] leading-snug text-foreground">
          Life-threatening.
          <br />
          Recommend EMS now.
        </p>
        <p className="text-[13px] text-muted-foreground sm:ml-auto">Awaiting dispatcher approval</p>
      </div>
    </figure>
  )
}

export function Hero() {
  return (
    <section aria-labelledby="hero-title" className="relative">
      <HeroRings />
      <div className="relative mx-auto grid max-w-[1120px] items-center gap-14 px-4 pt-12 pb-20 sm:px-6 sm:pt-16 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:pb-28">
        <div>
          <p className="eyebrow">AI Emergency Dispatch Assistant</p>
          <h1
            id="hero-title"
            className="mt-6 text-[44px] leading-[1.02] tracking-[-0.03em] sm:text-[56px] sm:leading-none lg:text-[64px]"
          >
            The first wave of help starts with the first second of the call.
          </h1>
          <p className="mt-7 max-w-[34rem] text-[17px] leading-[1.55] text-muted-foreground sm:text-[18px]">
            FirstWave talks to the caller, structures what it hears, and hands the dispatcher a triaged, mapped
            recommendation. A human approves every dispatch.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={CONSOLE_HREF}>Open the dispatcher console</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={DEMO_URL} target="_blank" rel="noopener noreferrer">
                Watch the demo
              </a>
            </Button>
          </div>
          <p className="mt-8 max-w-[38rem] text-[13px] leading-relaxed text-muted-foreground">
            Over 240 million emergency calls are made in the US each year (NENA). Key details get missed when callers
            panic.
          </p>
        </div>

        <SampleCallCard />
      </div>
    </section>
  )
}
