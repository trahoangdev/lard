import * as React from "react"
import { cn } from "@/lib/utils"

const Card = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement> & { variant?: 'default' | 'muted' | 'dark' }>(
  ({ className, variant = 'default', ...props }, ref) => {
    
    let variantClass = "bg-snow text-obsidian rounded-[36px]"
    if (variant === 'muted') {
      variantClass = "bg-fog text-obsidian rounded-[28px]"
    } else if (variant === 'dark') {
      variantClass = "bg-obsidian text-snow rounded-[36px]"
    }

    return (
      <div
        ref={ref}
        className={cn("p-[28px]", variantClass, className)}
        {...props}
      />
    )
  }
)
Card.displayName = "Card"

export { Card }
