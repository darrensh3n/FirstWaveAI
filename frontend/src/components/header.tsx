"use client"

import { useEffect, useState } from "react"
import { Activity } from "lucide-react"

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8000"
const HEALTH_POLL_MS = 15000

export function Header() {
  const [online, setOnline] = useState(true)

  useEffect(() => {
    const checkHealth = async () => {
      try {
        const response = await fetch(`${BACKEND_URL}/health`, { cache: "no-store" })
        setOnline(response.ok)
      } catch {
        setOnline(false)
      }
    }

    checkHealth()
    const interval = setInterval(checkHealth, HEALTH_POLL_MS)
    return () => clearInterval(interval)
  }, [])

  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
              <Activity className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                First<span className="text-emerald-500">Wave</span>
              </h1>
              <p className="text-xs text-muted-foreground">Emergency Response System</p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-secondary text-sm font-semibold text-foreground">
            <span className="relative flex w-2 h-2">
              <span
                className={`absolute inline-flex w-full h-full rounded-full opacity-75 animate-ping ${
                  online ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              <span
                className={`relative inline-flex w-2 h-2 rounded-full ${online ? "bg-emerald-500" : "bg-red-500"}`}
              />
            </span>
            <span>
              System:{" "}
              <span className={online ? "text-emerald-500" : "text-red-500"}>{online ? "Online" : "Offline"}</span>
            </span>
          </div>
        </div>
      </div>
    </header>
  )
}
