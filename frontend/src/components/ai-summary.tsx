"use client"

import type { ReactNode } from "react"
import { Loader2 } from "lucide-react"
import { Card, CardAction, CardContent, CardHeader, CardTitle, CardTile } from "@/components/ui/card"

export type SummaryData = {
  location: string | null
  incident: string | null
  priority: string | null
  keyFacts: string[]
  missingInfo: string[]
  isProcessing: boolean
}

interface AISummaryProps {
  data: SummaryData
}

function Analyzing() {
  return (
    <span className="flex items-center gap-2 text-sm text-muted-foreground">
      <Loader2 className="size-3 animate-spin text-primary" aria-hidden />
      Analyzing…
    </span>
  )
}

function SummaryTile({ label, value, isLoading }: { label: string; value: string | null; isLoading?: boolean }) {
  return (
    <CardTile className="min-w-0 px-3.5 py-3">
      <p className="field-label mb-1">{label}</p>
      {isLoading ? (
        <Analyzing />
      ) : value ? (
        <p className="text-sm font-semibold text-foreground">{value}</p>
      ) : (
        <p className="text-sm text-muted-foreground">Unknown</p>
      )}
    </CardTile>
  )
}

function SummarySection({
  title,
  items,
  isProcessing,
  emptyText,
  children,
}: {
  title: string
  items: string[]
  isProcessing: boolean
  emptyText: string
  children: ReactNode
}) {
  let body = children
  if (isProcessing && items.length === 0) body = <Analyzing />
  else if (items.length === 0) body = <p className="text-sm text-muted-foreground">{emptyText}</p>

  return (
    <section className="space-y-2">
      <h4 className="field-label font-sans">{title}</h4>
      {body}
    </section>
  )
}

export function AISummary({ data }: AISummaryProps) {
  const { location, incident, keyFacts, missingInfo, isProcessing } = data
  const hasData = Boolean(location || incident || keyFacts.length || missingInfo.length)

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>AI summary</CardTitle>
        {isProcessing && (
          <CardAction>
            <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden />
            Updating
          </CardAction>
        )}
      </CardHeader>

      <CardContent className="min-h-0 space-y-5 overflow-y-auto">
        <div className="grid grid-cols-2 gap-2.5">
          <SummaryTile label="Location" value={location} isLoading={isProcessing && !location} />
          <SummaryTile label="Incident" value={incident} isLoading={isProcessing && !incident} />
        </div>

        <SummarySection
          title="Key facts"
          items={keyFacts}
          isProcessing={isProcessing}
          emptyText={hasData ? "No key facts yet" : "Waiting for the caller…"}
        >
          <ul className="space-y-1.5">
            {keyFacts.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-foreground">
                <span className="mt-[0.55em] size-1 shrink-0 rounded-full bg-primary" aria-hidden />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </SummarySection>

        <SummarySection
          title="Still missing"
          items={missingInfo}
          isProcessing={isProcessing}
          emptyText={hasData ? "All information collected" : "—"}
        >
          <ul className="flex flex-wrap gap-1.5">
            {missingInfo.map((item) => (
              <li
                key={item}
                className="rounded-full border border-warning/50 px-3 py-1 text-[13px] text-warning"
              >
                {item}
              </li>
            ))}
          </ul>
        </SummarySection>
      </CardContent>
    </Card>
  )
}
