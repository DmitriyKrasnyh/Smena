import * as React from "react"
import { Input as InputPrimitive } from "@base-ui/react/input"
import { cn } from "@/lib/utils"

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <InputPrimitive
      type={type}
      data-slot="input"
      className={cn(
        "h-10 w-full min-w-0 rounded-[10px] border border-[#e4ddd2] bg-[#faf9f7] px-3.5 py-1 text-sm text-foreground transition-all outline-none",
        "placeholder:text-[#b0a99f]",
        "focus-visible:border-[#1a1a1a] focus-visible:ring-2 focus-visible:ring-[#1a1a1a]/10",
        "file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground",
        "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
        "aria-invalid:border-[#ef4444] aria-invalid:ring-2 aria-invalid:ring-[#ef4444]/20",
        className
      )}
      {...props}
    />
  )
}

export { Input }
