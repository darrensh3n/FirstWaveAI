"use client"

import { useEffect, useState, useRef } from "react"
import { Bot, CheckCircle2, Loader2, AlertTriangle, Sparkles } from "lucide-react"
import { cn } from "@/lib/utils"
import type { Incident, AgentStep } from "./emergency-dashboard"

interface AgentPanelProps {
  incident: Incident
  onStepsUpdate: (steps: AgentStep[]) => void
  onIncidentUpdate: (updates: Partial<Incident>) => void
  onComplete: () => void
}

// These map to the backend LangGraph agents
const AGENTS = [
  { id: "extraction", name: "Extraction Agent", description: "Extracting critical details from transcript" },
  { id: "triage", name: "Triage Agent", description: "Classifying emergency type and severity" },
  { id: "next_question", name: "Question Agent", description: "Identifying missing information" },
  { id: "dispatch_planner", name: "Dispatch Planner", description: "Recommending resources to dispatch" },
  { id: "resource_locator", name: "Resource Locator", description: "Finding nearest available units" },
  { id: "safety_guardrail", name: "Safety Guardrail", description: "Validating recommendations" },
]

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface DispatchResult {
  extracted: Record<string, unknown>
  incident_type: string
  severity: string | null
  key_risks: string[]
  missing_info: string[]
  suggested_questions: string[]
  info_complete: boolean
  dispatch_recommendation: Record<string, unknown>
  nearest_resources: Array<Record<string, unknown>>
  validated_output: Record<string, unknown>
}

export function AgentPanel({ incident, onStepsUpdate, onIncidentUpdate, onComplete }: AgentPanelProps) {
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0)
  const [dispatchResult, setDispatchResult] = useState<DispatchResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const processDispatch = async () => {
      // Initialize all steps as pending
      const steps: AgentStep[] = AGENTS.map((agent) => ({
        id: agent.id,
        agent: agent.name,
        title: agent.description,
        description: "",
        status: "pending" as const,
      }))
      onStepsUpdate(steps)

      try {
        // Simulate agent progression while waiting for backend
        const progressInterval = setInterval(() => {
          setCurrentAgentIndex((prev) => {
            if (prev < AGENTS.length - 1) {
              // Update step status
              steps[prev] = { ...steps[prev], status: "complete", timestamp: new Date() }
              steps[prev + 1] = { ...steps[prev + 1], status: "processing", timestamp: new Date() }
              onStepsUpdate([...steps])
              return prev + 1
            }
            return prev
          })
        }, 800)

        // Set first agent to processing
        steps[0] = { ...steps[0], status: "processing", timestamp: new Date() }
        onStepsUpdate([...steps])

        // Call the backend dispatch endpoint
        const response = await fetch(`${BACKEND_URL}/dispatch`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ transcript: incident.description }),
        })

        clearInterval(progressInterval)

        if (!response.ok) {
          throw new Error(`Backend error: ${response.status}`)
        }

        const result: DispatchResult = await response.json()
        setDispatchResult(result)

        // Mark all steps complete with their outputs
        const updatedSteps: AgentStep[] = AGENTS.map((agent, index) => {
          let output = ""
          switch (agent.id) {
            case "extraction":
              output = formatExtracted(result.extracted)
              break
            case "triage":
              output = `Type: ${result.incident_type}\nSeverity: ${result.severity}\nKey Risks: ${result.key_risks.join(", ")}`
              break
            case "next_question":
              output = result.info_complete
                ? "All critical information collected"
                : `Missing: ${result.missing_info.join(", ")}\n\nSuggested Questions:\n${result.suggested_questions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
              break
            case "dispatch_planner":
              output = formatDispatchRecommendation(result.dispatch_recommendation)
              break
            case "resource_locator":
              output = formatNearestResources(result.nearest_resources)
              break
            case "safety_guardrail":
              output = formatValidatedOutput(result.validated_output)
              break
          }
          return {
            id: agent.id,
            agent: agent.name,
            title: agent.description,
            description: output.slice(0, 100) + (output.length > 100 ? "..." : ""),
            status: "complete" as const,
            timestamp: new Date(),
            output,
          }
        })

        onStepsUpdate(updatedSteps)
        setCurrentAgentIndex(AGENTS.length)

        // Update incident with severity from backend
        if (result.severity) {
          const severityMap: Record<string, "low" | "medium" | "high" | "critical"> = {
            P1: "critical",
            P2: "high",
            P3: "medium",
            P4: "low",
          }
          onIncidentUpdate({
            severity: severityMap[result.severity] || "medium",
            type: result.incident_type,
          })
        }

        onComplete()
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to process emergency")
        // Mark current step as error
        steps[currentAgentIndex] = { ...steps[currentAgentIndex], status: "error" }
        onStepsUpdate([...steps])
        onComplete()
      }
    }

    processDispatch()
  }, [incident.description])

  const currentAgent = AGENTS[currentAgentIndex]
  const completedSteps = incident.steps.filter((s) => s.status === "complete")

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-secondary/30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground">AI Dispatch Agents</h3>
            <p className="text-sm text-muted-foreground">Processing emergency situation</p>
          </div>
        </div>
      </div>

      {/* Agent Progress */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6 overflow-x-auto">
          {AGENTS.map((agent, index) => (
            <div key={agent.id} className="flex items-center flex-shrink-0">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium transition-all",
                  index < currentAgentIndex
                    ? "bg-success text-success-foreground"
                    : index === currentAgentIndex
                      ? "bg-primary text-primary-foreground animate-pulse"
                      : "bg-secondary text-muted-foreground",
                )}
              >
                {index < currentAgentIndex ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : index === currentAgentIndex ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  index + 1
                )}
              </div>
              {index < AGENTS.length - 1 && (
                <div className={cn("w-6 h-0.5 mx-1", index < currentAgentIndex ? "bg-success" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">Error: {error}</span>
            </div>
          </div>
        )}

        {/* Current Agent Activity */}
        {currentAgentIndex < AGENTS.length && !error && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{currentAgent.name}</span>
            </div>
            <p className="text-sm text-muted-foreground">{currentAgent.description}</p>
          </div>
        )}

        {/* Completed Outputs */}
        {completedSteps.length > 0 && (
          <div className="space-y-4">
            <h4 className="text-sm font-medium text-muted-foreground">Completed Analysis</h4>
            {completedSteps.map((step) => (
              <div key={step.id} className="rounded-lg border border-border bg-secondary/30 p-4">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="text-sm font-medium text-foreground">{step.agent}</span>
                </div>
                {step.output && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{step.output}</p>}
              </div>
            ))}
          </div>
        )}

        {/* Final Dispatch Summary */}
        {dispatchResult?.validated_output && (
          <div className="mt-6 rounded-lg border-2 border-success/30 bg-success/5 p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-success" />
              <span className="font-semibold text-foreground">Dispatch Recommendation</span>
            </div>
            <div className="text-sm text-foreground whitespace-pre-wrap">
              {formatValidatedOutput(dispatchResult.validated_output)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// Helper functions to format backend response
function formatExtracted(extracted: Record<string, unknown>): string {
  if (!extracted || Object.keys(extracted).length === 0) return "No information extracted"
  return Object.entries(extracted)
    .filter(([, v]) => v != null)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")
}

function formatDispatchRecommendation(rec: Record<string, unknown>): string {
  if (!rec || Object.keys(rec).length === 0) return "No recommendation available"
  const parts = []
  if (rec.resources) parts.push(`Resources: ${(rec.resources as string[]).join(", ")}`)
  if (rec.response_code) parts.push(`Response: ${rec.response_code}`)
  if (rec.priority) parts.push(`Priority: ${rec.priority}`)
  if (rec.rationale) parts.push(`Rationale: ${rec.rationale}`)
  if (rec.special_units && (rec.special_units as string[]).length > 0) {
    parts.push(`Special Units: ${(rec.special_units as string[]).join(", ")}`)
  }
  return parts.join("\n")
}

function formatNearestResources(resources: Array<Record<string, unknown>>): string {
  if (!resources || resources.length === 0) return "No resources located"
  return resources
    .map((r) => `${r.type}: ${r.unit} (${r.station}) - ETA ${r.eta_minutes} min`)
    .join("\n")
}

function formatValidatedOutput(output: Record<string, unknown>): string {
  if (!output) return "Awaiting validation"
  const sanitized = output.sanitized_recommendation as Record<string, unknown> | undefined
  if (!sanitized) return JSON.stringify(output, null, 2)

  const parts = []
  if (sanitized.summary) parts.push(`Summary: ${sanitized.summary}`)
  if (sanitized.resources) parts.push(`Resources: ${(sanitized.resources as string[]).join(", ")}`)
  if (sanitized.priority) parts.push(`Priority: ${sanitized.priority}`)
  if (sanitized.eta_summary) parts.push(`ETA: ${sanitized.eta_summary}`)
  if (sanitized.dispatcher_script) parts.push(`\nScript: "${sanitized.dispatcher_script}"`)
  if (sanitized.safety_notes && (sanitized.safety_notes as string[]).length > 0) {
    parts.push(`\nSafety Notes:\n${(sanitized.safety_notes as string[]).map((n) => `• ${n}`).join("\n")}`)
  }
  if (output.flags && (output.flags as string[]).length > 0) {
    parts.push(`\n⚠️ Flags: ${(output.flags as string[]).join(", ")}`)
  }
  return parts.join("\n")
}
