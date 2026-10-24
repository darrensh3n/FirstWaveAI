"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

export type SettingsNavItem = { id: string; label: string }

/**
 * Sticky section nav that scroll-spies the cards on the right (design.md §4.3).
 * Desktop: vertical list. Mobile: horizontal scrolling tab row under the header.
 */
export function SettingsNav({ items }: { items: SettingsNavItem[] }) {
  const [active, setActive] = useState(items[0]?.id)

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((el): el is HTMLElement => el !== null)
    if (!sections.length) return

    const visible = new Map<string, boolean>()
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) visible.set(entry.target.id, entry.isIntersecting)
        // Topmost section inside the activation band wins.
        const first = items.find((item) => visible.get(item.id))
        if (first) setActive(first.id)
      },
      { rootMargin: "-25% 0px -60% 0px" }
    )
    sections.forEach((section) => observer.observe(section))

    // At the very bottom the last (short) section may never reach the band.
    const onScroll = () => {
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 2
      if (atBottom) setActive(items[items.length - 1].id)
    }
    window.addEventListener("scroll", onScroll, { passive: true })

    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", onScroll)
    }
  }, [items])

  return (
    <nav
      aria-label="Settings sections"
      className={cn(
        "sticky top-16 z-30 -mx-4 border-b border-border bg-background px-4 py-2 sm:-mx-6 sm:px-6",
        "md:top-24 md:mx-0 md:self-start md:border-b-0 md:bg-transparent md:p-0"
      )}
    >
      <ul className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
        {items.map((item) => {
          const isActive = item.id === active
          return (
            <li key={item.id} className="shrink-0">
              <a
                href={`#${item.id}`}
                onClick={() => setActive(item.id)}
                aria-current={isActive ? "location" : undefined}
                className={cn(
                  "block rounded-tile px-3 py-2 text-sm transition-colors",
                  isActive
                    ? "bg-card-raised font-medium text-foreground"
                    : "text-muted-foreground hover:bg-card-raised/60 hover:text-foreground"
                )}
              >
                {item.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
