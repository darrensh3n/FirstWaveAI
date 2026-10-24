import Link from "next/link"

import { Button } from "@/components/ui/button"
import { CONSOLE_HREF, GITHUB_URL } from "./links"
import { MapIllustration } from "./map-illustration"

const container = "mx-auto max-w-[1120px] px-4 sm:px-6"
const h2Class = "mt-5 text-[32px] leading-[1.1] tracking-[-0.02em] sm:text-[40px]"
const copyClass = "mt-6 text-[17px] leading-[1.6] text-muted-foreground"

const AGENTS = [
  { title: "Extraction", body: "Pulls location, injuries, hazards and headcount out of the live transcript." },
  { title: "Triage", body: "Classifies the emergency and assigns a P1 to P4 priority." },
  { title: "Next-Question", body: "Spots what is still missing and suggests the follow-up to ask." },
  { title: "Dispatch Planner", body: "Recommends EMS, Fire or Police for the incident." },
  { title: "Resource Locator", body: "Finds the nearest available units with ETAs." },
  { title: "Safety Guardrail", body: "Checks every recommendation before it reaches the dispatcher." },
]

export function PipelineSection() {
  return (
    <section id="pipeline" aria-labelledby="pipeline-title" className="scroll-mt-6 py-20 lg:py-28">
      <div className={container}>
        <p className="eyebrow">Multi-agent pipeline</p>
        <h2 id="pipeline-title" className={h2Class}>
          Six agents work the call <br className="hidden sm:block" /> while the caller is still talking.
        </h2>
        <ol className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AGENTS.map((agent, i) => (
            <li key={agent.title} className="rounded-card border border-border bg-card p-6 sm:p-7">
              <span className="font-mono text-[13px] text-primary">{String(i + 1).padStart(2, "0")}</span>
              <h3 className="mt-4 text-[20px] font-semibold tracking-[-0.01em]">{agent.title}</h3>
              <p className="mt-3 text-[15px] leading-[1.55] text-muted-foreground">{agent.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

const PRIORITIES = [
  { level: "P1", label: "Life-threatening, immediate response", color: "text-p1" },
  { level: "P2", label: "Urgent, serious but stable", color: "text-p2" },
  { level: "P3", label: "Needs a response, not time-critical", color: "text-p3" },
  { level: "P4", label: "Low priority, can wait", color: "text-p4" },
]

export function PrioritySection() {
  return (
    <section id="priority" aria-labelledby="priority-title" className="scroll-mt-6 py-20 lg:py-28">
      <div className={`${container} grid items-center gap-12 lg:grid-cols-2 lg:gap-14`}>
        <div>
          <p className="eyebrow">Human in control</p>
          <h2 id="priority-title" className={h2Class}>
            The AI recommends. <br className="hidden sm:block" /> The dispatcher decides.
          </h2>
          <p className={`${copyClass} max-w-[34rem]`}>
            Every recommendation lands with a priority, a rationale and the units to send. Nothing goes out until a
            dispatcher approves it, and cancelling takes one click.
          </p>
          {/* Illustration of the console controls. Non-functional, so hidden from assistive tech and tab order. */}
          <div className="mt-8 flex flex-wrap gap-3" aria-hidden="true">
            <Button type="button" tabIndex={-1} className="cursor-default">
              Approve dispatch
            </Button>
            <Button type="button" tabIndex={-1} variant="outline" className="cursor-default">
              Cancel
            </Button>
          </div>
        </div>

        <ul className="space-y-3" aria-label="Priority levels">
          {PRIORITIES.map((p) => (
            <li
              key={p.level}
              className="flex items-center gap-6 rounded-card border border-border bg-card px-6 py-5"
            >
              <span className={`w-12 shrink-0 font-display text-[32px] font-bold leading-none tracking-[-0.02em] sm:text-[36px] ${p.color}`}>
                {p.level}
              </span>
              <span className="text-[16px] text-foreground">{p.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function MapSection() {
  return (
    <section id="map" aria-labelledby="map-title" className="scroll-mt-6 py-20 lg:py-28">
      <div className={`${container} grid items-center gap-12 lg:grid-cols-2 lg:gap-14`}>
        <div className="order-2 lg:order-1">
          <MapIllustration />
        </div>
        <div className="order-1 lg:order-2">
          <p className="eyebrow">Resource mapping</p>
          <h2 id="map-title" className={h2Class}>
            See the nearest help before you send it.
          </h2>
          <p className={copyClass}>
            An interactive map plots the incident and the closest hospitals, fire stations, police and pharmacies, each
            with distance and travel time, built on Leaflet and OpenStreetMap.
          </p>
        </div>
      </div>
    </section>
  )
}

export function CtaBand() {
  return (
    <section aria-labelledby="cta-title" className="py-20 lg:py-28">
      <div className={container}>
        <div className="rounded-card border border-border bg-card px-6 py-14 sm:px-12 sm:py-16 lg:px-20 lg:py-20">
          <h2 id="cta-title" className="max-w-[36rem] text-[34px] leading-[1.05] tracking-[-0.025em] sm:text-[48px]">
            Give every dispatcher <br className="hidden sm:block" /> a faster first minute.
          </h2>
          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={CONSOLE_HREF}>Open the dispatcher console</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">
                View on GitHub
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  )
}

export function LandingFooter() {
  return (
    <footer className={`${container} flex flex-col gap-2 pt-4 pb-12 text-[13px] text-muted-foreground sm:flex-row sm:justify-between`}>
      <p>FirstWave · MIT License</p>
      <p>Next.js · FastAPI · LangGraph · Groq</p>
    </footer>
  )
}
