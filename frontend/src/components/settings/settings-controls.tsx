"use client"

import * as React from "react"
import { ChevronDown } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

/* Local building blocks for the settings page. The design calls for shadcn
   `slider` / `select` (design.md §7), which are not installed yet, so the
   slider and select here are native elements styled to §3. */

export function SettingsSection({
  id,
  title,
  children,
}: {
  id: string
  title: string
  children: React.ReactNode
}) {
  const headingId = `${id}-heading`
  return (
    <section id={id} aria-labelledby={headingId} className="scroll-mt-36 md:scroll-mt-24">
      <Card className="p-5">
        <h2 id={headingId} className="text-[15px] font-semibold leading-none">
          {title}
        </h2>
        <div className="mt-2">{children}</div>
      </Card>
    </section>
  )
}

/** One row: label + optional description left, control right. Rows are divided by a 1px border. */
export function SettingRow({
  label,
  description,
  htmlFor,
  labelId,
  descriptionId,
  children,
}: {
  label: string
  description?: string
  htmlFor?: string
  labelId?: string
  descriptionId?: string
  children: React.ReactNode
}) {
  const LabelTag = htmlFor ? "label" : "span"
  return (
    <div className="flex items-center justify-between gap-6 border-b border-border py-3.5 last:border-b-0 last:pb-1">
      <div className="min-w-0">
        <LabelTag id={labelId} htmlFor={htmlFor} className="block text-sm font-medium text-foreground">
          {label}
        </LabelTag>
        {description && (
          <p id={descriptionId} className="mt-0.5 text-[13px] leading-snug text-muted-foreground">
            {description}
          </p>
        )}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

/** Switch row. `locked` renders a checked, non-interactive switch at 55% opacity (Human approval). */
export function SwitchRow({
  id,
  label,
  description,
  checked,
  onCheckedChange,
  locked = false,
}: {
  id: string
  label: string
  description?: string
  checked: boolean
  onCheckedChange?: (checked: boolean) => void
  locked?: boolean
}) {
  const descriptionId = description ? `${id}-description` : undefined
  return (
    <SettingRow label={label} description={description} htmlFor={id} descriptionId={descriptionId}>
      <Switch
        id={id}
        checked={locked ? true : checked}
        onCheckedChange={locked ? undefined : onCheckedChange}
        disabled={locked}
        aria-describedby={descriptionId}
        className={cn(
          // Off track is --border-strong per design.md §3 (shared Switch defaults to --input).
          "data-[state=unchecked]:bg-border-strong",
          "disabled:cursor-not-allowed disabled:opacity-55"
        )}
      />
    </SettingRow>
  )
}

export function NativeSelect({
  className,
  children,
  ...props
}: React.ComponentProps<"select">) {
  return (
    <div className={cn("relative", className)}>
      <select
        className={cn(
          "h-9 w-full cursor-pointer appearance-none rounded-[8px] border border-border bg-input pl-3 pr-9 text-sm text-foreground transition-colors",
          "hover:border-border-strong focus-visible:border-primary/60"
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden
      />
    </div>
  )
}

/** Native range input: --primary filled track, light thumb (design.md §3). */
export function RangeSlider({
  value,
  min,
  max,
  step = 1,
  onValueChange,
  className,
  ...props
}: Omit<React.ComponentProps<"input">, "type" | "value" | "onChange" | "min" | "max" | "step"> & {
  value: number
  min: number
  max: number
  step?: number
  onValueChange: (value: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <input
      type="range"
      value={value}
      min={min}
      max={max}
      step={step}
      onChange={(e) => onValueChange(Number(e.target.value))}
      style={{
        background: `linear-gradient(to right, var(--primary) ${pct}%, var(--border-strong) ${pct}%)`,
      }}
      className={cn(
        "h-1.5 w-full cursor-pointer appearance-none rounded-full",
        "[&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-card [&::-webkit-slider-thumb]:bg-foreground",
        "[&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-card [&::-moz-range-thumb]:bg-foreground",
        "[&::-moz-range-track]:bg-transparent",
        className
      )}
      {...props}
    />
  )
}

const chipBase =
  "inline-flex h-9 items-center gap-2.5 rounded-[8px] border px-3 text-left text-sm transition-colors"
const chipOn = "border-primary/50 bg-primary-soft text-foreground"
const chipOff = "border-border bg-transparent text-muted-foreground hover:border-border-strong hover:text-foreground"

/** Toggle chip (Settings → Map types). Dot + label, selected = --primary-soft fill + --primary @ 50% border. */
export function FilterChip({
  selected,
  dotClassName,
  children,
  className,
  ...props
}: Omit<React.ComponentProps<"button">, "type"> & {
  selected: boolean
  dotClassName: string
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      className={cn(chipBase, selected ? chipOn : chipOff, className)}
      {...props}
    >
      <span className={cn("size-2 shrink-0 rounded-full", dotClassName)} aria-hidden />
      {children}
    </button>
  )
}

/** Single-choice chip group with roving focus and arrow-key navigation (Settings → Accent color). */
export function SwatchGroup<T extends string>({
  label,
  labelId,
  options,
  value,
  onValueChange,
}: {
  label: string
  labelId: string
  options: { value: T; label: string; color: string }[]
  value: T
  onValueChange: (value: T) => void
}) {
  const refs = React.useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const delta = e.key === "ArrowRight" || e.key === "ArrowDown" ? 1 : e.key === "ArrowLeft" || e.key === "ArrowUp" ? -1 : 0
    if (!delta) return
    e.preventDefault()
    const next = (index + delta + options.length) % options.length
    onValueChange(options[next].value)
    refs.current[next]?.focus()
  }

  return (
    <div>
      <span id={labelId} className="block text-sm font-medium text-foreground">
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={labelId} className="mt-2.5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {options.map((option, i) => {
          const selected = option.value === value
          return (
            <button
              key={option.value}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              onClick={() => onValueChange(option.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(chipBase, selected ? chipOn : chipOff)}
            >
              <span className="size-3.5 shrink-0 rounded-full" style={{ backgroundColor: option.color }} aria-hidden />
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
