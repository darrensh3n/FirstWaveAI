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

const AGENTS = [
  { id: "triage", name: "Triage Agent", description: "Classifying emergency type and severity" },
  { id: "assessment", name: "Assessment Agent", description: "Analyzing situation details" },
  { id: "protocol", name: "Protocol Agent", description: "Determining response protocols" },
  { id: "guidance", name: "Guidance Agent", description: "Generating step-by-step instructions" },
  { id: "resources", name: "Resource Agent", description: "Identifying required resources" },
]

export function AgentPanel({ incident, onStepsUpdate, onIncidentUpdate, onComplete }: AgentPanelProps) {
  const [currentAgentIndex, setCurrentAgentIndex] = useState(0)
  const [streamingText, setStreamingText] = useState("")
  const [finalGuidance, setFinalGuidance] = useState<string[]>([])
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (hasStartedRef.current) return
    hasStartedRef.current = true

    const processAgents = async () => {
      const steps: AgentStep[] = AGENTS.map((agent) => ({
        id: agent.id,
        agent: agent.name,
        title: agent.description,
        description: "",
        status: "pending" as const,
      }))

      onStepsUpdate(steps)

      for (let i = 0; i < AGENTS.length; i++) {
        setCurrentAgentIndex(i)

        // Update current step to processing
        steps[i] = { ...steps[i], status: "processing", timestamp: new Date() }
        onStepsUpdate([...steps])

        // Simulate API call to process with this agent
        try {
          const response = await fetch("/api/emergency", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              agent: AGENTS[i].id,
              description: incident.description,
              previousSteps: steps.filter((s) => s.status === "complete"),
            }),
          })

          if (!response.ok) throw new Error("Failed to process")

          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          let agentOutput = ""

          if (reader) {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break

              const chunk = decoder.decode(value)
              agentOutput += chunk
              setStreamingText(agentOutput)
            }
          }

          // Update step with output
          steps[i] = {
            ...steps[i],
            status: "complete",
            output: agentOutput,
            description: agentOutput.slice(0, 100) + (agentOutput.length > 100 ? "..." : ""),
          }
          onStepsUpdate([...steps])

          // Update incident details based on triage agent
          if (AGENTS[i].id === "triage") {
            const severityMatch = agentOutput.toLowerCase()
            let severity: "low" | "medium" | "high" | "critical" = "medium"
            if (severityMatch.includes("critical")) severity = "critical"
            else if (severityMatch.includes("high")) severity = "high"
            else if (severityMatch.includes("low")) severity = "low"

            onIncidentUpdate({ severity })
          }

          // Collect final guidance
          if (AGENTS[i].id === "guidance") {
            const lines = agentOutput.split("\n").filter((l) => l.trim())
            setFinalGuidance(lines)
          }

          setStreamingText("")
        } catch (error) {
          steps[i] = { ...steps[i], status: "error", description: "Failed to process" }
          onStepsUpdate([...steps])
        }

        // Small delay between agents
        await new Promise((r) => setTimeout(r, 500))
      }

      onComplete()
    }

    processAgents()
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
            <h3 className="font-semibold text-foreground">AI Response Agents</h3>
            <p className="text-sm text-muted-foreground">Processing emergency situation</p>
          </div>
        </div>
      </div>

      {/* Agent Progress */}
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          {AGENTS.map((agent, index) => (
            <div key={agent.id} className="flex items-center">
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
                <div className={cn("w-8 h-0.5 mx-1", index < currentAgentIndex ? "bg-success" : "bg-border")} />
              )}
            </div>
          ))}
        </div>

        {/* Current Agent Activity */}
        {currentAgentIndex < AGENTS.length && (
          <div className="rounded-lg border border-primary/30 bg-primary/5 p-4 mb-6">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-primary">{currentAgent.name}</span>
            </div>
            <p className="text-sm text-muted-foreground mb-3">{currentAgent.description}</p>
            {streamingText && (
              <div className="rounded-md bg-background/50 p-3 text-sm text-foreground font-mono whitespace-pre-wrap">
                {streamingText}
                <span className="inline-block w-2 h-4 bg-primary/70 animate-pulse ml-0.5" />
              </div>
            )}
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

        {/* Final Guidance */}
        {finalGuidance.length > 0 && (
          <div className="mt-6 rounded-lg border-2 border-success/30 bg-success/5 p-4">
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-success" />
              <span className="font-semibold text-foreground">Recommended Actions</span>
            </div>
            <ol className="space-y-2">
              {finalGuidance.map((step, index) => (
                <li key={index} className="flex items-start gap-3 text-sm">
                  <span className="w-6 h-6 rounded-full bg-success/20 text-success flex items-center justify-center text-xs font-bold flex-shrink-0">
                    {index + 1}
                  </span>
                  <span className="text-foreground">{step}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  )
}
