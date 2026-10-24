import { Cross, Flame, Pill, Shield, type LucideIcon } from "lucide-react"

// Static illustration only. The console uses the live Leaflet map.
const W = 614
const H = 458
const INCIDENT = { x: 307, y: 229 }

type Marker = { label: string; legend: string; x: number; y: number; icon: LucideIcon; bg: string }

const MARKERS: Marker[] = [
  { label: "Hospital", legend: "Hospitals", x: 187, y: 142, icon: Cross, bg: "bg-resource-medical" },
  { label: "Fire station", legend: "Fire stations", x: 438, y: 153, icon: Flame, bg: "bg-resource-fire" },
  { label: "Police", legend: "Police", x: 384, y: 339, icon: Shield, bg: "bg-resource-police" },
  { label: "Pharmacy", legend: "Pharmacies", x: 165, y: 317, icon: Pill, bg: "bg-resource-pharmacy" },
]

const pos = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` })

export function MapIllustration() {
  return (
    <figure className="overflow-hidden rounded-card border border-border bg-card">
      <div
        role="img"
        aria-label="Illustration: an incident pin surrounded by the nearest hospital, fire station, police station and pharmacy"
        className="relative aspect-[614/458] bg-background"
      >
        <svg viewBox={`0 0 ${W} ${H}`} fill="none" aria-hidden="true" className="absolute inset-0 size-full">
          {/* Street grid */}
          <g stroke="var(--border-strong)" strokeWidth="1.5">
            {[121, 307, 492].map((x) => (
              <line key={`v${x}`} x1={x} y1="0" x2={x} y2={H} />
            ))}
            {[98, 229, 359].map((y) => (
              <line key={`h${y}`} x1="0" y1={y} x2={W} y2={y} />
            ))}
          </g>
          {/* Main roads */}
          <g stroke="var(--border-strong)" strokeWidth="4" strokeLinecap="round" opacity="0.9">
            <line x1="220" y1="0" x2="395" y2={H} />
            <line x1="0" y1="163" x2={W} y2="295" />
          </g>
          {/* Search radius rings */}
          <g stroke="var(--primary)" strokeWidth="1">
            <circle cx={INCIDENT.x} cy={INCIDENT.y} r="50" opacity="0.3" />
            <circle cx={INCIDENT.x} cy={INCIDENT.y} r="105" opacity="0.2" />
            <circle cx={INCIDENT.x} cy={INCIDENT.y} r="160" opacity="0.12" />
          </g>
        </svg>

        {/* Incident pin: P1 color, dot + ring halo */}
        <span
          aria-hidden="true"
          className="absolute flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
          style={pos(INCIDENT.x, INCIDENT.y)}
        >
          <span className="absolute inset-0 animate-wave-ring rounded-full border border-p1/60" />
          <span className="absolute size-7 rounded-full border-2 border-p1/70" />
          <span className="size-4 rounded-full bg-p1" />
        </span>

        {MARKERS.map(({ label, x, y, icon: Icon, bg }) => (
          <span
            key={label}
            aria-hidden="true"
            className={`absolute flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-card ${bg}`}
            style={pos(x, y)}
          >
            <Icon className="size-3 text-primary-foreground" strokeWidth={2.75} />
          </span>
        ))}
      </div>

      <figcaption className="border-t border-border px-5 py-3.5">
        <ul className="flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-muted-foreground">
          {MARKERS.map(({ legend, bg }) => (
            <li key={legend} className="flex items-center gap-2">
              <span aria-hidden="true" className={`size-2 rounded-full ${bg}`} />
              {legend}
            </li>
          ))}
        </ul>
      </figcaption>
    </figure>
  )
}
