"use client"

import { CheckCircle2, Loader2, Clock, AlertCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import type { AgentStep } from "./agent-panel"

interface StatusTimelineProps {
  steps: AgentStep[]
}

export function StatusTimeline({ steps }: StatusTimelineProps) {
  if (steps.length === 0) return null

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="text-lg font-semibold text-foreground mb-4">Activity Timeline</h3>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start gap-3">
            <div className="relative">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center",
                  step.status === "complete" && "bg-success/20 text-success",
                  step.status === "processing" && "bg-primary/20 text-primary",
                  step.status === "pending" && "bg-secondary text-muted-foreground",
                  step.status === "error" && "bg-destructive/20 text-destructive",
                )}
              >
                {step.status === "complete" && <CheckCircle2 className="w-4 h-4" />}
                {step.status === "processing" && <Loader2 className="w-4 h-4 animate-spin" />}
                {step.status === "pending" && <Clock className="w-4 h-4" />}
                {step.status === "error" && <AlertCircle className="w-4 h-4" />}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={cn(
                    "absolute top-8 left-1/2 -translate-x-1/2 w-0.5 h-8",
                    step.status === "complete" ? "bg-success/50" : "bg-border",
                  )}
                />
              )}
            </div>

            <div className="flex-1 pb-4">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.status === "complete" && "text-foreground",
                  step.status === "processing" && "text-primary",
                  step.status === "pending" && "text-muted-foreground",
                  step.status === "error" && "text-destructive",
                )}
              >
                {step.agent}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{step.title}</p>
              {step.timestamp && (
                <p className="text-xs text-muted-foreground mt-1">{step.timestamp.toLocaleTimeString()}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
