"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Mic, MicOff, Send, User, Bot, Keyboard, MessageSquare, AlertCircle, Volume2, VolumeX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

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
  const [useTextInput, setUseTextInput] = useState(false)
  const [textInput, setTextInput] = useState("")
  const [speechError, setSpeechError] = useState<string | null>(null)
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  
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
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
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

  const toggleInputMode = useCallback(() => {
    // Stop listening if switching to text mode
    if (!useTextInput && isListening) {
      intentionalStopRef.current = true
      
      // Clean shutdown of recognition
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
      
      onStopListening()
      onTranscriptChange("")
      accumulatedTranscriptRef.current = ""
    }
    setSpeechError(null)
    setUseTextInput(!useTextInput)
  }, [useTextInput, isListening, onStopListening, onTranscriptChange])

  const dismissError = useCallback(() => {
    setSpeechError(null)
  }, [])

  return (
    <div className="rounded-xl border border-border bg-card h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-foreground text-sm">Caller ↔ AI Chat</h3>
            <p className="text-xs text-muted-foreground">
              {useTextInput ? "Text input mode" : "Voice input mode"}
            </p>
          </div>
          <div className="flex items-center gap-3">
            {/* TTS Toggle */}
            {onTtsToggle && (
              <div className="flex items-center gap-1.5">
                {ttsEnabled ? (
                  <Volume2 className="w-3.5 h-3.5 text-primary" />
                ) : (
                  <VolumeX className="w-3.5 h-3.5 text-muted-foreground" />
                )}
                <Switch
                  checked={ttsEnabled}
                  onCheckedChange={onTtsToggle}
                  className="scale-75"
                />
              </div>
            )}
            {/* Status indicators */}
            {isSpeaking && (
              <div className="flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-primary animate-pulse" />
                <span className="text-xs text-primary font-medium">Speaking</span>
              </div>
            )}
            {isListening && (
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs text-rose-500 font-medium">Recording</span>
              </div>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleInputMode}
              className="text-muted-foreground hover:text-foreground"
              title={useTextInput ? "Switch to voice" : "Switch to text"}
            >
              {useTextInput ? (
                <MessageSquare className="w-4 h-4" />
              ) : (
                <Keyboard className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Speech Error Banner */}
      {speechError && (
        <div className="px-4 py-2 bg-destructive/10 border-b border-destructive/20 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <p className="text-xs">{speechError}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismissError}
            className="h-6 px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            Dismiss
          </Button>
        </div>
      )}

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {messages.length === 0 && !currentTranscript && (
          <div className="h-full flex flex-col items-center justify-center text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
              <Mic className="w-6 h-6 text-muted-foreground/50" />
            </div>
            <p className="text-sm text-muted-foreground">Chat bubbles appear here</p>
            <p className="text-xs text-muted-foreground/70 mt-1">Click start to begin recording</p>
          </div>
        )}

        {messages.map((message) => (
          <div
            key={message.id}
            className={cn(
              "flex gap-2",
              message.role === "caller" ? "justify-end" : "justify-start"
            )}
          >
            {message.role === "ai" && (
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4 text-primary" />
              </div>
            )}
            <div
              className={cn(
                "max-w-[80%] rounded-xl px-3 py-2 text-sm",
                message.role === "caller"
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-foreground"
              )}
            >
              {message.content}
            </div>
            {message.role === "caller" && (
              <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                <User className="w-4 h-4 text-muted-foreground" />
              </div>
            )}
          </div>
        ))}

        {/* Current transcript being recorded */}
        {currentTranscript && (
          <div className="flex gap-2 justify-end">
            <div className="max-w-[80%] rounded-xl px-3 py-2 text-sm bg-primary/70 text-primary-foreground animate-pulse">
              {currentTranscript}
              <span className="inline-block w-1.5 h-4 bg-primary-foreground/70 ml-1 animate-pulse" />
            </div>
            <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
              <User className="w-4 h-4 text-muted-foreground" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-border flex-shrink-0">
        {useTextInput ? (
          /* Text Input Mode */
          <div className="flex gap-2">
            <Textarea
              ref={textareaRef}
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message here... (Enter to send)"
              disabled={disabled}
              className="min-h-[44px] max-h-[120px] resize-none bg-secondary/50"
              rows={1}
            />
            <Button
              onClick={handleTextSubmit}
              disabled={disabled || !textInput.trim()}
              size="icon"
              className="flex-shrink-0 h-[44px] w-[44px]"
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        ) : (
          /* Voice Input Mode */
          <>
            <div className="flex items-center justify-center">
              <Button
                onClick={handleMicClick}
                disabled={disabled || !speechSupported}
                size="lg"
                variant={isListening ? "destructive" : "default"}
                className={cn(
                  "gap-2 px-6 transition-all",
                  isListening && "animate-pulse"
                )}
              >
                {isListening ? (
                  <>
                    <MicOff className="w-5 h-5" />
                    Stop Listening
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5" />
                    Start Listening
                  </>
                )}
              </Button>
            </div>
            {!speechSupported && (
              <p className="text-xs text-center text-muted-foreground mt-2">
                Speech recognition not supported in this browser
              </p>
            )}
          </>
        )}
      </div>
    </div>
  )
}
