"use client"

import { useEffect, useRef, useState } from "react"
import { Mic, MicOff, Send, User, Bot, Keyboard, MessageSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
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
}: ChatPanelProps) {
  const [speechSupported, setSpeechSupported] = useState(true)
  const [useTextInput, setUseTextInput] = useState(false)
  const [textInput, setTextInput] = useState("")
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      if (!SpeechRecognition) {
        setSpeechSupported(false)
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

        const newText = currentTranscript + finalTranscript + interimTranscript
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

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const handleMicClick = () => {
    if (isListening) {
      onStopListening()
      // Submit the transcript when stopping
      if (currentTranscript.trim()) {
        onSubmit(currentTranscript)
        onTranscriptChange("")
      }
    } else {
      onStartListening()
    }
  }

  const handleTextSubmit = () => {
    if (textInput.trim() && !disabled) {
      onSubmit(textInput.trim())
      setTextInput("")
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleTextSubmit()
    }
  }

  const toggleInputMode = () => {
    // Stop listening if switching to text mode
    if (!useTextInput && isListening) {
      onStopListening()
    }
    setUseTextInput(!useTextInput)
  }

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
          <div className="flex items-center gap-2">
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
