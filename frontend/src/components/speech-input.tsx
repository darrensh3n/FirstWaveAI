"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, MicOff, Send, Keyboard, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface SpeechInputProps {
  isListening: boolean
  transcript: string
  onStartListening: () => void
  onStopListening: () => void
  onTranscriptChange: (text: string) => void
  onSubmit: (transcript: string) => void
  disabled?: boolean
}

export function SpeechInput({
  isListening,
  transcript,
  onStartListening,
  onStopListening,
  onTranscriptChange,
  onSubmit,
  disabled,
}: SpeechInputProps) {
  const [showManualInput, setShowManualInput] = useState(false)
  const [speechSupported, setSpeechSupported] = useState(true)
  const recognitionRef = useRef<any | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        setSpeechSupported(false)
        setShowManualInput(true)
      }
    }
  }, [])

  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) return

    if (isListening) {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = true
      recognitionRef.current.interimResults = true
      recognitionRef.current.lang = "en-US"

      recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
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

        const newText = transcript + finalTranscript + interimTranscript
        onTranscriptChange(newText)
      }

      recognitionRef.current.onerror = (event: SpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error)
        onStopListening()
      }

      recognitionRef.current.start()
    } else {
      recognitionRef.current?.stop()
    }

    return () => {
      recognitionRef.current?.stop()
    }
  }, [isListening])

  const handleMicClick = () => {
    if (isListening) {
      onStopListening()
    } else {
      onStartListening()
    }
  }

  const handleSubmit = () => {
    if (transcript.trim()) {
      onSubmit(transcript)
    }
  }

  const handleClear = () => {
    onTranscriptChange("")
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-foreground">Emergency Input</h2>
        {speechSupported && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowManualInput(!showManualInput)}
            className="text-muted-foreground"
          >
            <Keyboard className="w-4 h-4 mr-2" />
            {showManualInput ? "Voice Mode" : "Type Instead"}
          </Button>
        )}
      </div>

      {!showManualInput && speechSupported ? (
        <div className="space-y-6">
          {/* Voice Input Area */}
          <div className="flex flex-col items-center justify-center py-8">
            <button
              onClick={handleMicClick}
              disabled={disabled}
              className={cn(
                "relative w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300",
                isListening
                  ? "bg-emergency/20 border-2 border-emergency"
                  : "bg-primary/20 border-2 border-primary hover:bg-primary/30",
                disabled && "opacity-50 cursor-not-allowed",
              )}
            >
              {isListening && (
                <>
                  <div className="absolute inset-0 rounded-full bg-emergency/20 animate-pulse-ring" />
                  <div
                    className="absolute inset-[-8px] rounded-full border-2 border-emergency/30 animate-pulse-ring"
                    style={{ animationDelay: "0.5s" }}
                  />
                </>
              )}
              {isListening ? (
                <MicOff className="w-10 h-10 text-emergency relative z-10" />
              ) : (
                <Mic className="w-10 h-10 text-primary relative z-10" />
              )}
            </button>

            <p className={cn("mt-4 text-sm font-medium", isListening ? "text-emergency" : "text-muted-foreground")}>
              {isListening ? "Listening... Click to stop" : "Click to start speaking"}
            </p>

            {isListening && (
              <div className="flex items-center gap-1 mt-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="w-1 h-6 bg-emergency rounded-full wave-bar" />
                ))}
              </div>
            )}
          </div>

          {/* Transcript Display */}
          {transcript && (
            <div className="relative rounded-lg border border-border bg-secondary/50 p-4">
              <div className="flex items-start justify-between gap-4">
                <p className="text-foreground leading-relaxed flex-1">{transcript}</p>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleClear}
                  className="text-muted-foreground hover:text-foreground flex-shrink-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <Textarea
            placeholder="Describe the emergency situation..."
            value={transcript}
            onChange={(e) => onTranscriptChange(e.target.value)}
            disabled={disabled}
            className="min-h-[150px] bg-secondary/50 border-border resize-none"
          />
        </div>
      )}

      {/* Submit Button */}
      <div className="mt-6 flex justify-end">
        <Button
          onClick={handleSubmit}
          disabled={!transcript.trim() || disabled}
          className="bg-primary text-primary-foreground hover:bg-primary/90"
        >
          <Send className="w-4 h-4 mr-2" />
          Analyze Situation
        </Button>
      </div>
    </div>
  )
}
