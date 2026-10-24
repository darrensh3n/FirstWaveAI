import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full text-sm font-semibold transition-[background-color,border-color,color,filter] disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:brightness-106",
        destructive: "bg-danger text-primary-foreground hover:brightness-106",
        outline:
          "border border-border-strong bg-transparent text-foreground hover:bg-card-raised",
        secondary: "bg-card-raised text-foreground hover:bg-border-strong",
        ghost: "text-muted-foreground hover:bg-card-raised hover:text-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-11 px-5 has-[>svg]:px-4",
        sm: "h-8 gap-1.5 px-3 text-[13px] has-[>svg]:px-2.5",
        lg: "h-12 px-6 text-[15px] has-[>svg]:px-5",
        icon: "size-10 rounded-tile",
        "icon-sm": "size-8 rounded-tile",
        "icon-lg": "size-11 rounded-tile",
      },
    },
    compoundVariants: [
      // Icon buttons sit on a raised square (mic, settings) unless they're primary (send).
      { variant: "outline", size: ["icon", "icon-sm", "icon-lg"], class: "bg-card-raised border-border" },
    ],
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean
  }) {
  const Comp = asChild ? Slot : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
}

export { Button, buttonVariants }
