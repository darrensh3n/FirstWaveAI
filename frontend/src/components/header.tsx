"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Radio, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
    <header className="sticky top-0 z-50 border-b border-border bg-card shadow-elevated">
      <div className="flex h-[76px] items-center justify-between px-6">
        <Link href="/" className="flex items-center gap-3 rounded-tile" aria-label="FirstWave home">
          <Radio className="size-8 text-primary" strokeWidth={2.25} aria-hidden />
          <div>
            <p className="font-display text-xl font-bold leading-tight tracking-tight text-foreground">FirstWave</p>
            <p className="text-xs text-muted-foreground">Emergency Response System</p>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div
            role="status"
            className="flex h-10 items-center gap-2 rounded-full bg-card-raised px-4 text-sm font-semibold"
          >
            <span
              className={cn("size-2 rounded-full animate-pulse-dot", online ? "bg-success" : "bg-danger")}
              aria-hidden
            />
            <span className="text-foreground">
              System:{" "}
              <span className={online ? "text-success" : "text-danger"}>{online ? "Online" : "Offline"}</span>
            </span>
          </div>

          <Button asChild variant="outline" size="icon" aria-label="Settings">
            <Link href="/settings">
              <SlidersHorizontal />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
