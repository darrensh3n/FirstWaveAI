"use client"

import { Ambulance, Flame, Shield, AlertTriangle, Check, X, Settings2, MessageCircleQuestion } from "lucide-react"
import { Button } from "@/components/ui/button"
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
  onOverride?: () => void
  isProcessing: boolean
  hasStartedConversation?: boolean
}

function ResourceCount({
  icon: Icon,
  label,
  count,
  color
}: {
  icon: React.ElementType
  label: string
  count: number
  color: string
}) {
  const isNeeded = count > 0
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-2">
        <Icon className={cn("w-4 h-4", color)} />
        <span className="text-sm text-foreground">{label}</span>
      </div>
      <span className={cn(
        "text-sm font-semibold",
        isNeeded ? color : "text-muted-foreground"
      )}>
        {isNeeded ? "Yes" : "No"}
      </span>
    </div>
  )
}

export function DispatchPanel({
  recommendation,
  onApprove,
  onCancel,
  onOverride,
  isProcessing,
  hasStartedConversation = false,
}: DispatchPanelProps) {
  const { ems, fire, police, priority, status, specialUnits, needsMoreInfo, rationale } = recommendation

  const priorityColors: Record<string, string> = {
    P1: "text-rose-500 bg-rose-500/20",
    P2: "text-orange-500 bg-orange-500/20",
    P3: "text-amber-500 bg-amber-500/20",
    P4: "text-emerald-500 bg-emerald-500/20",
  }

  const priorityDescriptions: Record<string, string> = {
    P1: "Life-threatening, immediate response",
    P2: "Urgent, serious but stable",
    P3: "Non-urgent, needs response",
    P4: "Low priority, can wait",
  }

  const statusConfig = {
    pending: { label: "Pending", color: "text-amber-500", bg: "bg-amber-500/20" },
    approved: { label: "Approved", color: "text-emerald-500", bg: "bg-emerald-500/20" },
    cancelled: { label: "Cancelled", color: "text-muted-foreground", bg: "bg-muted" },
  }

  const currentStatus = statusConfig[status]

  return (
    <div className="rounded-xl border border-border bg-card h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-foreground text-sm">Dispatch</h3>
              <span className={cn(
                "text-xs px-2 py-0.5 rounded-full font-medium",
                currentStatus.bg,
                currentStatus.color
              )}>
                {currentStatus.label}
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Resource recommendation</p>
          </div>
          {onOverride && (
            <Button variant="ghost" size="icon" className="w-8 h-8" onClick={onOverride}>
              <Settings2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Recommendations */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Priority Badge */}
        {priority && (
          <div className="flex flex-col items-center justify-center gap-1">
            <div className={cn(
              "px-4 py-2 rounded-lg text-center",
              priorityColors[priority] || "text-muted-foreground bg-muted"
            )}>
              <p className="text-xs uppercase tracking-wider opacity-80">Priority</p>
              <p className="text-2xl font-bold">{priority}</p>
            </div>
            <p className="text-xs text-muted-foreground text-center">
              {priorityDescriptions[priority] || "Unknown priority level"}
            </p>
          </div>
        )}

        {/* Rationale - Human-readable recommendation */}
        {rationale && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
            <p className="text-sm text-foreground leading-relaxed">{rationale}</p>
          </div>
        )}

        {/* Resource Counts */}
        <div className="rounded-lg border border-border bg-secondary/30 p-3">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-2">Recommended</p>
          <div className="divide-y divide-border">
            <ResourceCount
              icon={Ambulance}
              label="EMS"
              count={ems}
              color="text-rose-500"
            />
            <ResourceCount
              icon={Flame}
              label="Fire"
              count={fire}
              color="text-orange-500"
            />
            <ResourceCount
              icon={Shield}
              label="Police"
              count={police}
              color="text-sky-500"
            />
          </div>
        </div>

        {/* Special Units */}
        {specialUnits && specialUnits.length > 0 && (
          <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
            <div className="flex items-center gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <p className="text-xs text-amber-500 uppercase tracking-wider font-medium">Special Units</p>
            </div>
            <ul className="space-y-1">
              {specialUnits.map((unit, index) => (
                <li key={index} className="text-sm text-foreground flex items-center gap-2">
                  <span className="text-amber-500">•</span>
                  {unit}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Empty State - Waiting for more info */}
        {!isProcessing && ems === 0 && fire === 0 && police === 0 && !priority && hasStartedConversation && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-sky-500/20 flex items-center justify-center mb-3">
              <MessageCircleQuestion className="w-6 h-6 text-sky-500" />
            </div>
            <p className="text-sm font-medium text-foreground">Gathering Information</p>
            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">
              More details needed before dispatch recommendation
            </p>
            <p className="text-xs text-sky-500 mt-2">
              Answer the questions in the chat
            </p>
          </div>
        )}

        {/* Empty State - Not started */}
        {!isProcessing && ems === 0 && fire === 0 && police === 0 && !priority && !hasStartedConversation && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="w-8 h-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground">No recommendation yet</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Start recording to analyze</p>
          </div>
        )}

        {/* Processing State */}
        {isProcessing && (
          <div className="flex flex-col items-center justify-center py-4 text-center">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2" />
            <p className="text-sm text-muted-foreground">Analyzing...</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="p-4 border-t border-border flex-shrink-0">
        <div className="flex gap-2">
          <Button
            onClick={onApprove}
            disabled={isProcessing || status !== "pending" || !priority}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            <Check className="w-4 h-4 mr-2" />
            APPROVE
          </Button>
          <Button
            onClick={onCancel}
            disabled={isProcessing || status !== "pending" || !priority}
            variant="outline"
            className="flex-1 border-destructive/50 text-destructive hover:bg-destructive/10"
          >
            <X className="w-4 h-4 mr-2" />
            CANCEL
          </Button>
        </div>
      </div>
    </div>
  )
}
