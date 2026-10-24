import * as React from "react"

import { cn } from "@/lib/utils"

function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn("flex flex-col rounded-card border border-border bg-card text-card-foreground", className)}
      {...props}
    />
  )
}

/** 52px header row: title left, status (CardAction) right, divider below. */
function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn("flex min-h-13 items-center justify-between gap-3 border-b border-border px-5", className)}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3
      data-slot="card-title"
      className={cn("font-display text-[15px] font-semibold leading-none text-foreground", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"p">) {
  return <p data-slot="card-description" className={cn("text-sm text-muted-foreground", className)} {...props} />
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn("flex shrink-0 items-center gap-2 text-[13px] text-muted-foreground", className)}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-content" className={cn("flex-1 p-5", className)} {...props} />
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center gap-3 border-t border-border p-5", className)}
      {...props}
    />
  )
}

/** Nested tile inside a card (summary fields, unit counts). */
function CardTile({ className, ...props }: React.ComponentProps<"div">) {
  return <div data-slot="card-tile" className={cn("rounded-tile bg-card-raised p-3", className)} {...props} />
}

export { Card, CardHeader, CardTitle, CardDescription, CardAction, CardContent, CardFooter, CardTile }
