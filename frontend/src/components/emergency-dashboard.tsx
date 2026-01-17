"use client"

import { useState, useRef, useEffect } from "react"
import { ChatPanel, type ChatMessage } from "./chat-panel"
import { AISummary, type SummaryData } from "./ai-summary"
import { DispatchPanel, type DispatchRecommendation } from "./dispatch-panel"
import { NearbyResources } from "./nearby-resources"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"

interface DispatchResult {
  extracted: Record<string, unknown>
  incident_type: string
  severity: string | null
  key_risks: string[]
  missing_info: string[]
  suggested_questions: string[]
  info_complete: boolean
  dispatch_recommendation: {
    resources?: string[]
    priority?: string
    special_units?: string[]
  }
  nearest_resources: Array<Record<string, unknown>>
  validated_output: Record<string, unknown>
}

export function EmergencyDashboard() {
  const [isListening, setIsListening] = useState(false)
  const [currentTranscript, setCurrentTranscript] = useState("")
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const hasProcessedRef = useRef(false)

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

  const handleStartListening = () => {
    setIsListening(true)
  }

  const handleStopListening = () => {
    setIsListening(false)
  }

  const handleTranscriptChange = (text: string) => {
    setCurrentTranscript(text)
  }

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

    // Start processing
    setIsProcessing(true)
    setSummaryData((prev) => ({ ...prev, isProcessing: true }))

    try {
      // Call the backend dispatch endpoint
      const response = await fetch(`${BACKEND_URL}/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript }),
      })

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`)
      }

      const result: DispatchResult = await response.json()

      // Update AI Summary
      const extracted = result.extracted as Record<string, string>
      setSummaryData({
        location: extracted.location || extracted.address || null,
        incident: result.incident_type || null,
        priority: result.severity || null,
        keyFacts: result.key_risks || [],
        missingInfo: result.missing_info || [],
        isProcessing: false,
      })

      // Update Dispatch Recommendation
      const resources = result.dispatch_recommendation?.resources || []
      const emsCount = resources.filter((r) => 
        r.toLowerCase().includes("ems") || 
        r.toLowerCase().includes("ambulance") ||
        r.toLowerCase().includes("medic")
      ).length || (resources.some(r => r.toLowerCase().includes("medical")) ? 1 : 0)
      
      const fireCount = resources.filter((r) => 
        r.toLowerCase().includes("fire") || 
        r.toLowerCase().includes("engine") ||
        r.toLowerCase().includes("ladder")
      ).length
      
      const policeCount = resources.filter((r) => 
        r.toLowerCase().includes("police") || 
        r.toLowerCase().includes("officer") ||
        r.toLowerCase().includes("patrol")
      ).length

      setDispatch({
        ems: emsCount || (result.incident_type?.toLowerCase().includes("medical") ? 1 : 0),
        fire: fireCount || (result.incident_type?.toLowerCase().includes("fire") ? 1 : 0),
        police: policeCount,
        priority: result.severity || null,
        status: "pending",
        specialUnits: result.dispatch_recommendation?.special_units || [],
      })

      // Add AI response message if there are suggested questions
      if (result.suggested_questions && result.suggested_questions.length > 0) {
        const aiMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "ai",
          content: result.suggested_questions[0],
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMessage])
      } else if (!result.info_complete && result.missing_info.length > 0) {
        const aiMessage: ChatMessage = {
          id: crypto.randomUUID(),
          role: "ai",
          content: `I need more information about: ${result.missing_info.join(", ")}. Can you provide more details?`,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, aiMessage])
      }

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
