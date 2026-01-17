"use client"

import { AlertTriangle, MapPin, Clock, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { Incident } from "./agent-panel"

interface IncidentSummaryProps {
  incident: Incident
  onReset: () => void
}

const severityConfig = {
  low: { label: "Low", color: "bg-info/20 text-info border-info/30" },
  medium: { label: "Medium", color: "bg-warning/20 text-warning border-warning/30" },
  high: { label: "High", color: "bg-accent/20 text-accent border-accent/30" },
  critical: { label: "Critical", color: "bg-emergency/20 text-emergency border-emergency/30" },
}

export function IncidentSummary({ incident, onReset }: IncidentSummaryProps) {
  const severity = severityConfig[incident.severity]

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Incident Summary</h3>
        <Button variant="ghost" size="sm" onClick={onReset} className="text-muted-foreground">
          <RotateCcw className="w-4 h-4 mr-2" />
          New
        </Button>
      </div>

      <div className="space-y-4">
        {/* Severity Badge */}
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Severity:</span>
          <span className={cn("px-2 py-0.5 rounded text-xs font-medium border", severity.color)}>{severity.label}</span>
        </div>

        {/* Time Started */}
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Started:</span>
          <span className="text-sm text-foreground">{incident.startTime.toLocaleTimeString()}</span>
        </div>

        {/* Location (if available) */}
        {incident.location && (
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">Location:</span>
            <span className="text-sm text-foreground">{incident.location}</span>
          </div>
        )}

        {/* Description Preview */}
        <div className="pt-2 border-t border-border">
          <p className="text-xs text-muted-foreground mb-1">Description:</p>
          <p className="text-sm text-foreground line-clamp-3">{incident.description}</p>
        </div>

        {/* Progress */}
        <div className="pt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
            <span>Processing Progress</span>
            <span>
              {incident.steps.filter((s) => s.status === "complete").length}/{incident.steps.length}
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-500"
              style={{
                width: `${
                  (incident.steps.filter((s) => s.status === "complete").length / Math.max(incident.steps.length, 1)) *
                  100
                }%`,
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}
