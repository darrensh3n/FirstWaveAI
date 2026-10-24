"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardAction, CardContent, CardFooter, CardHeader, CardTitle, CardTile } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export type DispatchRecommendation = {
  ems: number
  fire: number
  police: number
  priority: string | null
  status: "pending" | "approved" | "cancelled"
  specialUnits?: string[]
  needsMoreInfo?: boolean
  rationale?: string  // Human-readable recommendation sentence
}

interface DispatchPanelProps {
  recommendation: DispatchRecommendation
  onApprove: () => void
  onCancel: () => void
  isProcessing: boolean
  hasStartedConversation?: boolean
}

// Priority scale (design.md §2.1): text color, card fill @ 8–10%, border @ 30%.
const PRIORITY_STYLES: Record<string, { text: string; card: string; description: string }> = {
  P1: { text: "text-p1", card: "bg-p1/10 border-p1/30", description: "Life-threatening, immediate response" },
  P2: { text: "text-p2", card: "bg-p2/10 border-p2/30", description: "Urgent, serious but stable" },
  P3: { text: "text-p3", card: "bg-p3/10 border-p3/30", description: "Needs a response, not time-critical" },
  P4: { text: "text-p4", card: "bg-p4/10 border-p4/30", description: "Low priority, can wait" },
}

const STATUS_BADGE = {
  pending: { label: "Awaiting approval", className: "bg-warning/12 text-warning" },
  approved: { label: "Dispatched", className: "bg-success/12 text-success" },
  cancelled: { label: "Cancelled", className: "bg-card-raised text-muted-foreground" },
} as const

function UnitTile({ label, count }: { label: string; count: number }) {
  return (
    <CardTile className="flex flex-col items-center justify-center gap-0.5 py-3">
      <span
        className={cn(
          "font-display text-2xl font-bold leading-none tabular-nums",
          count > 0 ? "text-foreground" : "text-subtle-foreground"
        )}
      >
        {count}
      </span>
      <span className="text-xs text-muted-foreground">{label}</span>
    </CardTile>
  )
}

export function DispatchPanel({
  recommendation,
  onApprove,
  onCancel,
  isProcessing,
  hasStartedConversation = false,
}: DispatchPanelProps) {
  const { ems, fire, police, priority, status, specialUnits, rationale } = recommendation
  const priorityStyle = priority ? PRIORITY_STYLES[priority] : undefined
  const hasRecommendation = Boolean(priority)
  const badge = status === "pending" && !hasRecommendation ? null : STATUS_BADGE[status]
  const actionsDisabled = isProcessing || status !== "pending" || !priority

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Dispatch</CardTitle>
        <CardAction>
          {badge && (
            <span className={cn("rounded-md px-2 py-1 text-xs font-semibold", badge.className)}>{badge.label}</span>
          )}
        </CardAction>
      </CardHeader>

      <CardContent
        className="flex min-h-0 flex-col gap-4 overflow-y-auto"
        aria-live={priority === "P1" ? "assertive" : "polite"}
      >
        {/* Priority card */}
        {priority ? (
          <div
            className={cn(
              "flex items-center gap-4 rounded-tile border px-4 py-3.5",
              priorityStyle?.card ?? "border-border bg-card-raised"
            )}
          >
            <span
              className={cn(
                "font-display text-[34px] font-bold leading-none",
                priorityStyle?.text ?? "text-foreground"
              )}
            >
              {priority}
            </span>
            <span className="text-sm text-foreground">
              {priorityStyle?.description ?? "Unknown priority level"}
            </span>
          </div>
        ) : (
          <div className="flex min-h-[66px] items-center gap-3 rounded-tile border border-dashed border-border-strong px-4 py-3.5 text-sm text-muted-foreground">
            {isProcessing ? (
              <>
                <Loader2 className="size-4 animate-spin text-primary" aria-hidden />
                Analyzing the call…
              </>
            ) : hasStartedConversation ? (
              "More details needed before a recommendation. Ask the caller the questions in the transcript."
            ) : (
              "No recommendation yet"
            )}
          </div>
        )}

        {/* Unit counts */}
        <div className="grid grid-cols-3 gap-2.5">
          <UnitTile label="EMS" count={ems} />
          <UnitTile label="Fire" count={fire} />
          <UnitTile label="Police" count={police} />
        </div>

        {specialUnits && specialUnits.length > 0 && (
          <div className="space-y-2">
            <p className="field-label">Special units</p>
            <div className="flex flex-wrap gap-1.5">
              {specialUnits.map((unit) => (
                <span key={unit} className="rounded-full bg-card-raised px-2.5 py-1 text-xs text-foreground">
                  {unit}
                </span>
              ))}
            </div>
          </div>
        )}

        {rationale && (
          <div className="space-y-1.5">
            <p className="field-label">Rationale</p>
            <p className="text-sm leading-relaxed text-foreground">{rationale}</p>
          </div>
        )}
      </CardContent>

      <CardFooter className="border-t-0 pt-0">
        <Button onClick={onApprove} disabled={actionsDisabled} className="flex-1">
          Approve dispatch
        </Button>
        <Button onClick={onCancel} disabled={actionsDisabled} variant="outline" className="flex-1">
          Cancel
        </Button>
      </CardFooter>
    </Card>
  )
}
