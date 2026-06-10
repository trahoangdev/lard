import * as React from "react"
import { cn } from "@/lib/utils"

export type InputProps = React.InputHTMLAttributes<HTMLInputElement>

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex w-full rounded-[14px] border border-pebble bg-snow px-[16px] py-[12px] text-sm font-medium file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-ash focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-graphite disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
