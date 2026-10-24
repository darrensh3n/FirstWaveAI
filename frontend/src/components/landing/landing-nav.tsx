import Link from "next/link"

import { Button } from "@/components/ui/button"
import { CONSOLE_HREF, SETTINGS_HREF } from "./links"

/** `((•))` mark. Decorative: the wordmark next to it carries the name. */
export function WaveLogo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 24" fill="none" aria-hidden="true" className={className}>
      <circle cx="16" cy="12" r="2.6" fill="currentColor" />
      <path d="M10.5 6.5a7.8 7.8 0 0 0 0 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M21.5 6.5a7.8 7.8 0 0 1 0 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M6 2.5a13.5 13.5 0 0 0 0 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M26 2.5a13.5 13.5 0 0 1 0 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}

const NAV_LINKS = [
  { href: "#pipeline", label: "Pipeline" },
  { href: "#priority", label: "Priority" },
  { href: "#map", label: "Map" },
]

const linkClass =
  "rounded-full px-1 text-[15px] font-medium text-muted-foreground transition-colors hover:text-foreground"

export function LandingNav() {
  return (
    <header className="relative z-10">
      <nav
        aria-label="Main"
        className="mx-auto flex h-20 max-w-[1120px] items-center justify-between gap-4 px-4 sm:px-6"
      >
        <Link href="/" className="flex items-center gap-2.5 rounded-md">
          <WaveLogo className="h-6 w-8 text-primary" />
          <span className="font-display text-[19px] font-bold tracking-[-0.01em] text-foreground">FirstWave</span>
        </Link>

        <div className="flex items-center gap-5 sm:gap-7">
          <ul className="hidden items-center gap-7 md:flex">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <a href={link.href} className={linkClass}>
                  {link.label}
                </a>
              </li>
            ))}
            <li>
              <Link href={SETTINGS_HREF} className={linkClass}>
                Settings
              </Link>
            </li>
          </ul>
          <Button asChild>
            <Link href={CONSOLE_HREF}>Open console</Link>
          </Button>
        </div>
      </nav>
    </header>
  )
}
