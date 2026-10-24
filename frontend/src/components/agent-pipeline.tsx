"use client"

import { Check, Circle, Loader2 } from "lucide-react"
import { Card, CardAction, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

// Mirrors the backend LangGraph agents (same ids/names as agent-panel.tsx).
// design.md §4.2 wants these in src/lib/agents.ts; kept local until that file exists.
const AGENTS = [
  { id: "extraction", name: "Extraction Agent" },
  { id: "triage", name: "Triage Agent" },
  { id: "next_question", name: "Question Agent" },
  { id: "dispatch_planner", name: "Dispatch Planner" },
  { id: "resource_locator", name: "Resource Locator" },
  { id: "safety_guardrail", name: "Safety Guardrail" },
] as const

type RowStatus = "waiting" | "running" | "complete"

const STATUS_LABEL: Record<RowStatus, string> = {
  waiting: "Waiting",
  running: "Running",
  complete: "Complete",
}

interface AgentPipelineProps {
  /** Agent id of the most recent SSE event, or null. */
  currentAgent: string | null
  isProcessing: boolean
  /** True once a run has produced a dispatch recommendation (all agents ran). */
  hasCompletedRun: boolean
}

/**
 * Visual pipeline card. Row state is derived from the dashboard's existing
 * `currentAgent` / `isProcessing` values: each SSE event marks its agent (and the
 * ones before it) complete and the next one running.
 */
export function AgentPipeline({ currentAgent, isProcessing, hasCompletedRun }: AgentPipelineProps) {
  const currentIndex = currentAgent ? AGENTS.findIndex((a) => a.id === currentAgent) : -1
  // wait_for_info: the graph stopped after the question agent to ask for more details.
  const pausedAfter = currentAgent === "wait_for_info" ? AGENTS.findIndex((a) => a.id === "next_question") : null

  const statusFor = (index: number): RowStatus => {
    if (isProcessing && pausedAfter !== null) {
      return index <= pausedAfter ? "complete" : "waiting"
    }
    if (isProcessing) {
      if (index <= currentIndex) return "complete"
      if (index === currentIndex + 1) return "running"
      return "waiting"
    }
    return hasCompletedRun ? "complete" : "waiting"
  }

  const statuses = AGENTS.map((_, i) => statusFor(i))
  const doneCount = statuses.filter((s) => s === "complete").length

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Agent pipeline</CardTitle>
        <CardAction className="font-mono text-xs">
          {doneCount}/{AGENTS.length}
        </CardAction>
      </CardHeader>
      <ol className="flex-1 divide-y divide-border px-5 py-2" aria-label="Agent pipeline status">
        {AGENTS.map((agent, i) => {
          const status = statuses[i]
          return (
            <li key={agent.id} className="flex min-h-[46px] items-center gap-3">
              <span className="flex size-5 shrink-0 items-center justify-center" aria-hidden>
                {status === "complete" ? (
                  <span className="flex size-5 items-center justify-center rounded-full bg-success/15 text-success">
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                ) : status === "running" ? (
                  <Loader2 className="size-4 animate-spin text-primary" />
                ) : (
                  <Circle className="size-4 text-subtle-foreground" />
                )}
              </span>
              <span className={cn("flex-1 text-sm", status === "waiting" ? "text-muted-foreground" : "text-foreground")}>
                {agent.name}
              </span>
              <span
                className={cn(
                  "text-xs",
                  status === "running" ? "text-primary" : "text-muted-foreground"
                )}
              >
                {STATUS_LABEL[status]}
              </span>
            </li>
          )
        })}
      </ol>
    </Card>
  )
}
