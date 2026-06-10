import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center whitespace-nowrap text-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default: "bg-obsidian text-snow rounded-full-6 px-[16px] py-[12px] shadow-subtle hover:opacity-90 font-medium",
        outline: "border border-graphite bg-snow text-graphite rounded-full-6 px-[20px] py-[12px] hover:bg-mist hover:text-obsidian font-medium",
        secondary: "bg-obsidian text-snow border border-white/20 rounded-2xl-2 px-[18px] py-[14px] hover:bg-ink font-medium",
        ghost: "hover:bg-fog hover:text-obsidian rounded-2xl-2 px-[16px] py-[12px]",
        link: "text-obsidian underline-offset-4 hover:underline font-medium",
      },
      size: {
        default: "",
        sm: "h-8 rounded-full-6 px-3 text-xs",
        lg: "h-12 rounded-full-6 px-8",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
