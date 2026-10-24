"use client"

import {useEffect, useRef, useState, useCallback} from "react"
import {Mic, MicOff, ArrowRight, AlertCircle, Volume2, VolumeX} from "lucide-react"
import {Button} from "@/components/ui/button"
import {Card, CardAction, CardHeader, CardTitle} from "@/components/ui/card"
import {Input} from "@/components/ui/input"
import {cn} from "@/lib/utils"

export type ChatMessage = {
  id: string
  role: "caller" | "ai"
  content: string
  timestamp: Date
}

interface ChatPanelProps {
  isListening: boolean
  onStartListening: () => void
  onStopListening: () => void
  onTranscriptChange: (text: string) => void
  onSubmit: (transcript: string) => void
  messages: ChatMessage[]
  currentTranscript: string
  disabled?: boolean
  // TTS props
  ttsEnabled?: boolean
  onTtsToggle?: (enabled: boolean) => void
  isSpeaking?: boolean
}

// Speech recognition error messages
const SPEECH_ERROR_MESSAGES: Record<string, string> = {
  "no-speech": "No speech detected. Please try speaking again.",
  "audio-capture": "Microphone not available. Please check your microphone settings.",
  "not-allowed": "Microphone permission denied. Please allow microphone access.",
  "network": "Network error. Please check your internet connection.",
  "aborted": "Speech recognition was interrupted.",
  "service-not-allowed": "Speech recognition service is not available.",
}

export function ChatPanel({
  isListening,
  onStartListening,
  onStopListening,
  onTranscriptChange,
  onSubmit,
  messages,
  currentTranscript,
  disabled,
  ttsEnabled = false,
  onTtsToggle,
  isSpeaking = false,
}: ChatPanelProps) {
  const [speechSupported, setSpeechSupported] = useState(true)
  const [textInput, setTextInput] = useState("")
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // Use ref to track accumulated transcript to avoid stale closure issues
  const accumulatedTranscriptRef = useRef("")
  // Track if we're intentionally stopping (vs natural end)
  const intentionalStopRef = useRef(false)

  // Check for speech recognition support
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        setSpeechSupported(false)
      }
    }
  }, [])

  // Store callbacks in refs to avoid stale closures and unnecessary effect re-runs
  const onTranscriptChangeRef = useRef(onTranscriptChange)
  const onStopListeningRef = useRef(onStopListening)

  useEffect(() => {
    onTranscriptChangeRef.current = onTranscriptChange
    onStopListeningRef.current = onStopListening
  }, [onTranscriptChange, onStopListening])

  // Handle speech recognition lifecycle
  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    // Cleanup function
    const cleanup = () => {
      if (recognitionRef.current) {
        // Remove all event handlers first to prevent any callbacks during cleanup
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onend = null
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore errors when stopping
        }
        recognitionRef.current = null
      }
    }

    if (isListening) {
      // Clear any previous error when starting
      setSpeechError(null)
      intentionalStopRef.current = false
      // Start fresh - don't use currentTranscript here
      accumulatedTranscriptRef.current = ""

      try {
        const recognition = new SpeechRecognition()
        recognitionRef.current = recognition
        recognition.continuous = true
        recognition.interimResults = true
        recognition.lang = "en-US"

        recognition.onresult = (event: SpeechRecognitionEvent) => {
          // Check if we're still supposed to be listening
          if (intentionalStopRef.current) return

          let finalTranscript = ""
          let interimTranscript = ""

          for (let i = event.resultIndex; i < event.results.length; i++) {
            const result = event.results[i]
            if (result.isFinal) {
              finalTranscript += result[0].transcript
            } else {
              interimTranscript += result[0].transcript
            }
          }

          // Accumulate final results, show interim as preview
          if (finalTranscript) {
            accumulatedTranscriptRef.current += finalTranscript
          }

          const displayText = accumulatedTranscriptRef.current + interimTranscript
          onTranscriptChangeRef.current(displayText)
        }

        recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
          console.error("Speech recognition error:", event.error)

          // Don't show error for aborted (intentional stop)
          if (event.error === "aborted" && intentionalStopRef.current) {
            return
          }

          const errorMessage = SPEECH_ERROR_MESSAGES[event.error] || `Speech recognition error: ${event.error}`
          setSpeechError(errorMessage)

          // Stop listening on error
          onStopListeningRef.current()
        }

        recognition.onend = () => {
          // If recognition ended unexpectedly (not user-initiated stop),
          // try to restart if we're still supposed to be listening
          if (!intentionalStopRef.current) {
            // Recognition ended unexpectedly - this can happen with long pauses
            try {
              recognition.start()
            } catch (error) {
              console.warn("Could not restart speech recognition:", error)
              onStopListeningRef.current()
            }
          }
        }

        recognition.start()
      } catch (error) {
        console.error("Failed to start speech recognition:", error)
        setSpeechError("Failed to start speech recognition. Please try again.")
        onStopListeningRef.current()
      }
    } else {
      cleanup()
    }

    return cleanup
  }, [isListening]) // Only depend on isListening

  // Scroll to bottom when messages change
  useEffect(() => {
    // Scroll the transcript itself (scrollIntoView would also scroll the page)
    const log = logRef.current
    if (log) log.scrollTo({top: log.scrollHeight, behavior: "smooth"})
  }, [messages])

  const handleMicClick = useCallback(() => {
    if (isListening) {
      // Set flag FIRST to prevent any more processing in callbacks
      intentionalStopRef.current = true

      // Capture the transcript before stopping
      const transcriptToSubmit = accumulatedTranscriptRef.current.trim()

      // Stop recognition manually to ensure clean shutdown
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null
        recognitionRef.current.onerror = null
        recognitionRef.current.onend = null
        try {
          recognitionRef.current.stop()
        } catch {
          // Ignore errors
        }
        recognitionRef.current = null
      }

      // Now update state
      onStopListening()

      // Submit the transcript if we have content
      if (transcriptToSubmit) {
        onSubmit(transcriptToSubmit)
      }

      // Clear the transcript display and ref
      onTranscriptChange("")
      accumulatedTranscriptRef.current = ""
    } else {
      // Clear any previous error and accumulated transcript
      setSpeechError(null)
      accumulatedTranscriptRef.current = ""
      onTranscriptChange("")
      onStartListening()
    }
  }, [isListening, onStartListening, onStopListening, onSubmit, onTranscriptChange])

  const handleTextSubmit = useCallback(() => {
    if (textInput.trim() && !disabled) {
      onSubmit(textInput.trim())
      setTextInput("")
    }
  }, [textInput, disabled, onSubmit])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    }
  }, [handleTextSubmit])

  const dismissError = useCallback(() => {
    setSpeechError(null)
  }, [])

  const isEmpty = messages.length === 0 && !currentTranscript

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Live transcript</CardTitle>
        <CardAction className="gap-3">
          {isSpeaking && (
            <span className="flex items-center gap-1.5 text-primary">
              <Volume2 className="size-3.5" aria-hidden />
              Speaking
            </span>
          )}
          {isListening && (
            <span className="flex items-center gap-2" role="status">
              <span className="size-2 rounded-full bg-danger animate-pulse-dot" aria-hidden />
              Listening
            </span>
          )}
          {/* Spoken replies toggle. Lives here until Settings → Voice is wired up. */}
          {onTtsToggle && (
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onTtsToggle(!ttsEnabled)}
              aria-pressed={ttsEnabled}
              aria-label={ttsEnabled ? "Turn off spoken replies" : "Turn on spoken replies"}
              title={ttsEnabled ? "Spoken replies on" : "Spoken replies off"}
              className={cn(ttsEnabled && "text-primary hover:text-primary")}
            >
              {ttsEnabled ? <Volume2 /> : <VolumeX />}
            </Button>
          )}
        </CardAction>
      </CardHeader>

      {/* Speech Error Banner */}
      {speechError && (
        <div
          role="alert"
          className="flex items-center justify-between gap-2 border-b border-danger/25 bg-danger/10 px-5 py-2"
        >
          <div className="flex items-center gap-2 text-danger">
            <AlertCircle className="size-4 shrink-0" aria-hidden />
            <p className="text-xs">{speechError}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissError}
            className="h-6 px-2 text-danger hover:text-danger"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Chat Messages */}
      <div
        className="min-h-0 flex-1 space-y-3 overflow-y-auto p-5"
        ref={logRef}
        role="log"
        aria-live="polite"
        aria-label="Call transcript"
      >
        {isEmpty && (
          <div className="flex h-full flex-col items-center justify-center py-8 text-center">
            <p className="text-sm text-muted-foreground">Waiting for the caller…</p>
            <p className="mt-1 text-xs text-muted-foreground">Type the caller&apos;s words or press the mic to listen.</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn("flex", message.role === "caller" ? "justify-start" : "justify-end")}
          >
            <div
              className={cn(
                "max-w-[85%] rounded-xl px-3.5 py-2.5 text-sm leading-relaxed",
                message.role === "caller"
                  ? "bg-card-raised text-foreground"
                  : "border border-primary/35 bg-primary-soft text-foreground"
              )}
            >
              <span className="sr-only">{message.role === "caller" ? "Caller: " : "FirstWave: "}</span>
              {message.content}
            </div>
          </div>
        ))}

        {/* Current transcript being recorded */}
        {currentTranscript && (
          <div className="flex justify-start" aria-live="off">
            <div className="max-w-[85%] rounded-xl border border-dashed border-border-strong bg-card-raised/60 px-3.5 py-2.5 text-sm leading-relaxed text-muted-foreground">
              <span className="sr-only">Caller (live): </span>
              {currentTranscript}
              <span className="ml-1 inline-block h-4 w-1 translate-y-0.5 bg-muted-foreground/70 animate-pulse" aria-hidden />
            </div>
          </div>
        )}

      </div>

      {/* Input Area */}
      <div className="shrink-0 border-t border-border p-4">
        <div className="flex items-center gap-2">
          <Input
            value={textInput}
            onChange={(e) => setTextInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type or speak the caller's reply"
            disabled={disabled}
            aria-label="Caller's reply"
          />
          <Button
            onClick={handleMicClick}
            disabled={disabled || !speechSupported}
            variant="outline"
            size="icon"
            aria-pressed={isListening}
            aria-label={isListening ? "Stop listening and send" : "Start listening"}
            title={speechSupported ? undefined : "Speech recognition not supported in this browser"}
            className={cn(
              "shrink-0",
              isListening && "border-danger/50 bg-danger/15 text-danger hover:bg-danger/20"
            )}
          >
            {isListening ? <MicOff /> : <Mic />}
          </Button>
          <Button
            onClick={handleTextSubmit}
            disabled={disabled || !textInput.trim()}
            size="icon"
            className="shrink-0"
            aria-label="Send message"
          >
            <ArrowRight />
          </Button>
        </div>
        {!speechSupported && (
          <p className="mt-2 text-xs text-muted-foreground">Speech recognition isn&apos;t supported in this browser.</p>
        )}
      </div>
    </Card>
  )
}

