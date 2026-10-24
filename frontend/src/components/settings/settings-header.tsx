import Link from "next/link"
import { Radio } from "lucide-react"
import { Button } from "@/components/ui/button"

/** Settings page header: logo left, "Back to console" pill right (design.md §4.3). */
export function SettingsHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-[960px] items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5 rounded-tile" aria-label="FirstWave home">
          <Radio className="size-7 text-primary" strokeWidth={2.25} aria-hidden />
          <span className="font-display text-xl font-bold tracking-tight text-foreground">FirstWave</span>
        </Link>

        <Button asChild variant="outline" className="h-10 px-4">
          <Link href="/console">
            Back to console
          </Link>
        </Button>
      </div>
    </header>
  )
}
