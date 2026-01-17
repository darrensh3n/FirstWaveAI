"use client"

import { useState } from "react"
import { SpeechInput } from "./speech-input"
import { AgentPanel } from "./agent-panel"
import { StatusTimeline } from "./status-timeline"
import { IncidentSummary } from "./incident-summary"

export type AgentStep = {
  id: string
  agent: string
  title: string
  description: string
  status: "pending" | "processing" | "complete" | "error"
  timestamp?: Date
  output?: string
}

export type Incident = {
  id: string
  type: string
  severity: "low" | "medium" | "high" | "critical"
  location?: string
  description: string
  startTime: Date
  steps: AgentStep[]
}

export function EmergencyDashboard() {
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState("")
  const [currentIncident, setCurrentIncident] = useState<Incident | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const handleStartListening = () => {
    setIsListening(true)
  }

  const handleStopListening = () => {
    setIsListening(false)
  }

  const handleTranscriptChange = (text: string) => {
    setTranscript(text)
  }

  const handleSubmitIncident = async (finalTranscript: string) => {
    if (!finalTranscript.trim()) return

    setIsProcessing(true)

    const newIncident: Incident = {
      id: crypto.randomUUID(),
      type: "Unknown",
      severity: "medium",
      description: finalTranscript,
      startTime: new Date(),
      steps: [],
    }

    setCurrentIncident(newIncident)

    // The AgentPanel will handle the AI processing
  }

  const handleStepsUpdate = (steps: AgentStep[]) => {
    if (currentIncident) {
      setCurrentIncident({
        ...currentIncident,
        steps,
      })
    }
  }

  const handleIncidentUpdate = (updates: Partial<Incident>) => {
    if (currentIncident) {
      setCurrentIncident({
        ...currentIncident,
        ...updates,
      })
    }
  }

  const handleReset = () => {
    setCurrentIncident(null)
    setTranscript("")
    setIsProcessing(false)
    setIsListening(false)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Input & Agent Panel */}
        <div className="lg:col-span-2 space-y-6">
          <SpeechInput
            isListening={isListening}
            transcript={transcript}
            onStartListening={handleStartListening}
            onStopListening={handleStopListening}
            onTranscriptChange={handleTranscriptChange}
            onSubmit={handleSubmitIncident}
            disabled={isProcessing}
          />

          {currentIncident && (
            <AgentPanel
              incident={currentIncident}
              onStepsUpdate={handleStepsUpdate}
              onIncidentUpdate={handleIncidentUpdate}
              onComplete={() => setIsProcessing(false)}
            />
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {currentIncident && (
            <>
              <IncidentSummary incident={currentIncident} onReset={handleReset} />
              <StatusTimeline steps={currentIncident.steps} />
            </>
          )}

          {!currentIncident && (
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-lg font-semibold text-foreground mb-4">Quick Start</h3>
              <ul className="space-y-3 text-sm text-muted-foreground">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    1
                  </span>
                  <span>Click the microphone button to begin voice input</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    2
                  </span>
                  <span>Describe the emergency situation clearly</span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary flex items-center justify-center text-xs font-bold flex-shrink-0">
                    3
                  </span>
                  <span>AI agents will analyze and provide step-by-step guidance</span>
                </li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
