"use client"

import { useState, useRef, useCallback } from "react"
import { ChatPanel, type ChatMessage } from "./chat-panel"
import { AISummary, type SummaryData } from "./ai-summary"
import { DispatchPanel, type DispatchRecommendation } from "./dispatch-panel"
import { NearbyResources } from "./nearby-resources"
import { ErrorBoundary } from "./error-boundary"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

// Error types for better error handling
type StreamErrorType = "network" | "parse" | "timeout" | "backend" | "unknown"

interface StreamError {
  type: StreamErrorType
  message: string
  details?: string
}

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
  status?: string
  needs_more_info?: boolean
}

interface WaitForInfoData {
  dispatch_recommendation?: {
    status: "pending_info"
    needs_more_info: boolean
    rationale?: string
  }
}

interface StreamEvent {
  agent: string
  data: ExtractionData | TriageData | NextQuestionData | DispatchPlannerData | Record<string, unknown>
}

// Helper function to classify errors
function classifyError(error: unknown): StreamError {
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return {
      type: "network",
      message: "Unable to connect to the dispatch system. Please check your connection.",
      details: error.message,
    }
  }

  if (error instanceof SyntaxError) {
    return {
      type: "parse",
      message: "Received invalid data from the server. Please try again.",
      details: error.message,
    }
  }

  if (error instanceof Error) {
    if (error.message.includes("timeout") || error.name === "AbortError") {
      return {
        type: "timeout",
        message: "The request took too long. Please try again.",
        details: error.message,
      }
    }

    if (error.message.includes("Backend error") || error.message.includes("500")) {
      return {
        type: "backend",
        message: "The dispatch system encountered an error. Our team has been notified.",
        details: error.message,
      }
    }

    return {
      type: "unknown",
      message: error.message || "An unexpected error occurred. Please try again.",
      details: error.stack,
    }
  }

  return {
    type: "unknown",
    message: "An unexpected error occurred. Please try again.",
  }
}

// Helper to safely parse JSON with error context
function safeJsonParse<T>(jsonString: string, context: string): T | null {
  try {
    return JSON.parse(jsonString) as T
  } catch (error) {
    console.warn(`Failed to parse JSON in ${context}:`, jsonString, error)
    return null
  }
}

function EmergencyDashboardContent() {
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [streamError, setStreamError] = useState<StreamError | null>(null)

  // Ref to track current dispatch state for callbacks (avoids stale closures)
  const dispatchRef = useRef<DispatchRecommendation>({
    ems: 0,
    fire: 0,
    police: 0,
    priority: null,
    status: "pending",
    specialUnits: [],
  })

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

  // Keep ref in sync with state
  const updateDispatch = useCallback((updater: (prev: DispatchRecommendation) => DispatchRecommendation) => {
    setDispatch((prev) => {
      const next = updater(prev)
      dispatchRef.current = next
      return next
    })
  }, [])

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

  // Abort controller for canceling requests
  const abortControllerRef = useRef<AbortController | null>(null)

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

    try {
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
            updateDispatch((prev) => ({
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
            updateDispatch((prev) => ({
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

        case "wait_for_info": {
          // Not enough information to dispatch yet
          // The UI will show the suggested questions and wait for more input
          const waitData = data as WaitForInfoData
          if (waitData.dispatch_recommendation?.needs_more_info) {
            // Keep dispatch in a "needs more info" state
            updateDispatch((prev) => ({
              ...prev,
              ems: 0,
              fire: 0,
              police: 0,
              priority: null,
              // Keep status as pending - we're waiting for more info
            }))
          }
          break
        }

        default: {
          console.warn(`Unknown agent type: ${agent}`)
        }
      }
    } catch (error) {
      console.error(`Error processing event from agent ${agent}:`, error)
      // Don't throw - allow stream to continue processing other events
    }
  }, [updateDispatch])

  const handleSubmit = async (transcript: string) => {
    if (!transcript.trim()) return

    // Clear any previous errors
    setStreamError(null)

    // Cancel any in-progress request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    abortControllerRef.current = new AbortController()

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

    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

    try {
      // Call the streaming backend endpoint with full conversation context
      const response = await fetch(`${BACKEND_URL}/dispatch/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: `Caller: ${fullTranscript}` }),
        signal: abortControllerRef.current.signal,
      })

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        throw new Error(`Backend error: ${response.status} - ${errorText}`)
      }

      reader = response.body?.getReader() ?? null
      if (!reader) {
        throw new Error("No response body received from server")
      }

      const decoder = new TextDecoder()
      let buffer = ""
      let eventCount = 0
      const maxEvents = 100 // Safety limit to prevent infinite loops

      while (eventCount < maxEvents) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        // Process complete SSE events (separated by double newlines)
        const events = buffer.split("\n\n")
        buffer = events.pop() || "" // Keep incomplete event in buffer

        for (const eventText of events) {
          if (!eventText.trim()) continue
          eventCount++

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
            const errorInfo = safeJsonParse<{ error?: string }>(eventData, "error event")
            throw new Error(errorInfo?.error || "Stream error from server")
          } else if (eventData) {
            // Regular data event - parse with error handling
            const parsed = safeJsonParse<StreamEvent>(eventData, "stream event")
            if (parsed) {
              handleStreamEvent(parsed)
            }
            // If parsing fails, safeJsonParse logs the warning but we continue processing
          }
        }
      }

      if (eventCount >= maxEvents) {
        console.warn("Reached maximum event count, stream may be incomplete")
      }

      // Mark processing complete
      setSummaryData((prev) => ({ ...prev, isProcessing: false }))

    } catch (error) {
      // Don't show error for aborted requests (user cancelled)
      if (error instanceof Error && error.name === "AbortError") {
        console.log("Request was cancelled")
        return
      }

      const streamError = classifyError(error)
      console.error("Dispatch error:", streamError)
      setStreamError(streamError)

      // Add user-friendly error message to chat
      const errorMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "ai",
        content: streamError.message,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])

      setSummaryData((prev) => ({ ...prev, isProcessing: false }))
    } finally {
      // Clean up reader if it exists
      if (reader) {
        try {
          await reader.cancel()
        } catch {
          // Ignore cancel errors
        }
      }
      setIsProcessing(false)
      setCurrentAgent(null)
      abortControllerRef.current = null
    }
  }

  const handleApprove = () => {
    // Use ref to get current dispatch values (avoids stale closure)
    const currentDispatch = dispatchRef.current

    updateDispatch((prev) => ({ ...prev, status: "approved" }))

    // Build dispatch summary with proper formatting
    const units: string[] = []
    if (currentDispatch.ems > 0) units.push("EMS")
    if (currentDispatch.fire > 0) units.push("Fire")
    if (currentDispatch.police > 0) units.push("Police")

    const unitText = units.length > 0 ? units.join(", ") : "emergency"

    const confirmMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "ai",
      content: `✓ Dispatch approved. Sending units to the scene.`,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, confirmMessage])
  }

  const handleCancel = () => {
    // Cancel any in-progress request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    updateDispatch((prev) => ({ ...prev, status: "cancelled" }))

    const cancelMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "ai",
      content: "Dispatch cancelled. Ready for new incident.",
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, cancelMessage])
  }

  const handleReset = () => {
    // Cancel any in-progress request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    setMessages([])
    setCurrentTranscript("")
    setIsProcessing(false)
    setIsListening(false)
    setStreamError(null)
    setSummaryData({
      location: null,
      incident: null,
      priority: null,
      keyFacts: [],
      missingInfo: [],
      isProcessing: false,
    })
    const initialDispatch = {
      ems: 0,
      fire: 0,
      police: 0,
      priority: null,
      status: "pending" as const,
      specialUnits: [],
    }
    setDispatch(initialDispatch)
    dispatchRef.current = initialDispatch
  }

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Main 3-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 min-h-[500px]">
        {/* LEFT: Caller ↔ AI Chat + Mic */}
        <div className="lg:col-span-1">
          <ErrorBoundary onReset={handleReset}>
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
          </ErrorBoundary>
        </div>

        {/* CENTER: AI Summary */}
        <div className="lg:col-span-1">
          <ErrorBoundary onReset={handleReset}>
            <AISummary data={summaryData} />
          </ErrorBoundary>
        </div>

        {/* RIGHT: Dispatch (Pending) + Override */}
        <div className="lg:col-span-1">
          <ErrorBoundary onReset={handleReset}>
            <DispatchPanel
              recommendation={dispatch}
              onApprove={handleApprove}
              onCancel={handleCancel}
              onOverride={handleReset}
              isProcessing={isProcessing}
              hasStartedConversation={messages.length > 0}
            />
          </ErrorBoundary>
        </div>
      </div>

      {/* Nearby Resources Section */}
      <ErrorBoundary onReset={handleReset}>
        <NearbyResources />
      </ErrorBoundary>
    </div>
  )
}

export function EmergencyDashboard() {
  return (
    <ErrorBoundary>
      <EmergencyDashboardContent />
    </ErrorBoundary>
  )
}
