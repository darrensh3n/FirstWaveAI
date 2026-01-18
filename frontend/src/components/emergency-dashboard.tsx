"use client"

import { useState, useRef, useCallback } from "react"
import { ChatPanel, type ChatMessage } from "./chat-panel"
import { AISummary, type SummaryData } from "./ai-summary"
import { DispatchPanel, type DispatchRecommendation } from "./dispatch-panel"
import { NearbyResources } from "./nearby-resources"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

// Types for streaming agent responses
interface ExtractionData {
  location?: string | null
  address?: string | null
  injuries?: string | null
  hazards?: string | null
  people_count?: number | null
  caller_info?: string | null
}

interface TriageData {
  incident_type?: string
  severity?: string | null
  key_risks?: string[]
}

interface NextQuestionData {
  missing_info?: string[]
  suggested_questions?: string[]
  info_complete?: boolean
}

interface DispatchPlannerData {
  resources?: {
    ems?: string | number
    fire?: string | number
    police?: string | number
  }
  response_code?: string
  priority?: string
  rationale?: string
  special_units?: string[]
}

interface StreamEvent {
  agent: string
  data: ExtractionData | TriageData | NextQuestionData | DispatchPlannerData | Record<string, unknown>
}

export function EmergencyDashboard() {
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)

  // AI Summary state
  const [summaryData, setSummaryData] = useState<SummaryData>({
    location: null,
    incident: null,
    priority: null,
    keyFacts: [],
    missingInfo: [],
    isProcessing: false,
  })

  // Dispatch state
  const [dispatch, setDispatch] = useState<DispatchRecommendation>({
    ems: 0,
    fire: 0,
    police: 0,
    priority: null,
    status: "pending",
    specialUnits: [],
  })

  // Track which agent is currently processing
  const [currentAgent, setCurrentAgent] = useState<string | null>(null)

  // Accumulated state from streaming (for suggested questions at the end)
  const streamStateRef = useRef<{
    suggested_questions: string[]
    missing_info: string[]
    info_complete: boolean
  }>({
    suggested_questions: [],
    missing_info: [],
    info_complete: false,
  })

  const handleStartListening = () => {
    setIsListening(true)
  }

  const handleStopListening = () => {
    setIsListening(false)
  }

  const handleTranscriptChange = (text: string) => {
    setCurrentTranscript(text)
  }

  // Process each streaming event and update UI accordingly
  const handleStreamEvent = useCallback((event: StreamEvent) => {
    const { agent, data } = event
    setCurrentAgent(agent)

    switch (agent) {
      case "extraction": {
        const extractionData = data as ExtractionData
        setSummaryData((prev) => ({
          ...prev,
          location: extractionData.location || extractionData.address || prev.location,
        }))
        break
      }

      case "triage": {
        const triageData = data as TriageData
        setSummaryData((prev) => ({
          ...prev,
          incident: triageData.incident_type || prev.incident,
          priority: triageData.severity || prev.priority,
          keyFacts: triageData.key_risks || prev.keyFacts,
        }))
        // Also update dispatch priority early
        if (triageData.severity) {
          setDispatch((prev) => ({
            ...prev,
            priority: triageData.severity || prev.priority,
          }))
        }
        break
      }

      case "next_question": {
        const questionData = data as NextQuestionData
        setSummaryData((prev) => ({
          ...prev,
          missingInfo: questionData.missing_info || prev.missingInfo,
        }))
        // Store for end-of-stream AI message
        streamStateRef.current = {
          suggested_questions: questionData.suggested_questions || [],
          missing_info: questionData.missing_info || [],
          info_complete: questionData.info_complete || false,
        }
        break
      }

      case "dispatch_planner": {
        const dispatchData = data as { dispatch_recommendation?: DispatchPlannerData }
        const rec = dispatchData.dispatch_recommendation
        if (rec) {
          const resources = rec.resources || {}
          // Convert "yes"/"no" strings to 1/0, or keep numeric values
          const toCount = (val: string | number | undefined): number => {
            if (val === "yes") return 1
            if (val === "no") return 0
            if (typeof val === "number") return val
            return 0
          }
          setDispatch((prev) => ({
            ...prev,
            ems: toCount(resources.ems),
            fire: toCount(resources.fire),
            police: toCount(resources.police),
            priority: rec.priority || prev.priority,
            specialUnits: rec.special_units || [],
          }))
        }
        break
      }

      case "resource_locator": {
        // Resource locator provides nearest_resources, could update a separate state if needed
        break
      }

      case "safety_guardrail": {
        // Final validation complete - stream is done
        break
      }
    }
  }, [])

  const handleSubmit = async (transcript: string) => {
    if (!transcript.trim()) return

    // Add caller message
    const callerMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "caller",
      content: transcript,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, callerMessage])
    setCurrentTranscript("")

    // Reset stream state
    streamStateRef.current = {
      suggested_questions: [],
      missing_info: [],
      info_complete: false,
    }

    // Start processing
    setIsProcessing(true)
    setCurrentAgent(null)
    setSummaryData((prev) => ({ ...prev, isProcessing: true }))

    // Build full conversation transcript for context
    // Include all previous caller messages plus the new one
    const allCallerMessages = [...messages, callerMessage]
      .filter((m) => m.role === "caller")
      .map((m) => m.content)
    const fullTranscript = allCallerMessages.join("\n\nCaller: ")

    try {
      // Call the streaming backend endpoint with full conversation context
      const response = await fetch(`${BACKEND_URL}/dispatch/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: `Caller: ${fullTranscript}` }),
      })

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`)
      }

      const reader = response.body?.getReader()
      if (!reader) {
        throw new Error("No response body")
      }

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE events (separated by double newlines)
        const events = buffer.split("\n\n")
        buffer = events.pop() || "" // Keep incomplete event in buffer

        for (const eventText of events) {
          if (!eventText.trim()) continue

          // Parse SSE format
          const lines = eventText.split("\n")
          let eventType = "message"
          let eventData = ""

          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.slice(7)
            } else if (line.startsWith("data: ")) {
              eventData = line.slice(6)
            }
          }

          // Handle different event types
          if (eventType === "done") {
            // Stream complete - add AI message if needed
            const { suggested_questions, missing_info, info_complete } = streamStateRef.current

            if (suggested_questions.length > 0) {
              const aiMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "ai",
                content: suggested_questions[0],
                timestamp: new Date(),
              }
              setMessages((prev) => [...prev, aiMessage])
            } else if (!info_complete && missing_info.length > 0) {
              const aiMessage: ChatMessage = {
                id: crypto.randomUUID(),
                role: "ai",
                content: `I need more information about: ${missing_info.join(", ")}. Can you provide more details?`,
                timestamp: new Date(),
              }
              setMessages((prev) => [...prev, aiMessage])
            }
          } else if (eventType === "error") {
            const errorInfo = JSON.parse(eventData)
            throw new Error(errorInfo.error || "Stream error")
          } else if (eventData) {
            // Regular data event
            try {
              const parsed: StreamEvent = JSON.parse(eventData)
              handleStreamEvent(parsed)
            } catch {
              console.warn("Failed to parse event data:", eventData)
            }
          }
        }
      }

      // Mark processing complete
      setSummaryData((prev) => ({ ...prev, isProcessing: false }))

    } catch (error) {
      console.error("Dispatch error:", error)

      // Add error message
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        content: "I'm having trouble connecting to the dispatch system. Please try again.",
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])

      setSummaryData((prev) => ({ ...prev, isProcessing: false }))
    } finally {
      setIsProcessing(false)
      setCurrentAgent(null)
    }
  }

  const handleApprove = () => {
    setDispatch((prev) => ({ ...prev, status: "approved" }))

    // Add confirmation message
    const confirmMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "ai",
      content: `✓ Dispatch approved. Sending ${dispatch.ems > 0 ? `${dispatch.ems} EMS` : ""}${dispatch.fire > 0 ? `, ${dispatch.fire} Fire` : ""}${dispatch.police > 0 ? `, ${dispatch.police} Police` : ""} units to the scene.`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, confirmMessage])
  }

  const handleCancel = () => {
    setDispatch((prev) => ({ ...prev, status: "cancelled" }))

    const cancelMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "ai",
      content: "Dispatch cancelled. Ready for new incident.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, cancelMessage])
  }

  const handleReset = () => {
    setMessages([])
    setCurrentTranscript("")
    setIsProcessing(false)
    setIsListening(false)
    setSummaryData({
      location: null,
      incident: null,
      priority: null,
      keyFacts: [],
      missingInfo: [],
      isProcessing: false,
    })
    setDispatch({
      ems: 0,
      fire: 0,
      police: 0,
      priority: null,
      status: "pending",
      specialUnits: [],
    })
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
        {/* LEFT: Caller ↔ AI Chat + Mic */}
        <div className="lg:col-span-1">
          <ChatPanel
            isListening={isListening}
            onStartListening={handleStartListening}
            onStopListening={handleStopListening}
            onTranscriptChange={handleTranscriptChange}
            onSubmit={handleSubmit}
            messages={messages}
            currentTranscript={currentTranscript}
            disabled={isProcessing}
          />
        </div>

        {/* CENTER: AI Summary */}
        <div className="lg:col-span-1">
          <AISummary data={summaryData} />
        </div>

        {/* RIGHT: Dispatch (Pending) + Override */}
        <div className="lg:col-span-1">
          <DispatchPanel
            recommendation={dispatch}
            onApprove={handleApprove}
            onCancel={handleCancel}
            onOverride={handleReset}
            isProcessing={isProcessing}
          />
        </div>
      </div>

      {/* Nearby Resources Section */}
      <NearbyResources />
    </div>
  )
}
