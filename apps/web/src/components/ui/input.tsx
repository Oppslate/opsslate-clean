import * as React from "react"

import { cn } from "@/lib/utils"

const pickerInputTypes = new Set(["date", "datetime-local", "month", "time", "week"])

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, onClick, ...props }, forwardedRef) => {
    const inputRef = React.useRef<HTMLInputElement | null>(null)
    const supportsPicker = typeof type === "string" && pickerInputTypes.has(type)
    const setRef = (node: HTMLInputElement | null) => {
      inputRef.current = node
      if (typeof forwardedRef === "function") forwardedRef(node)
      else if (forwardedRef) forwardedRef.current = node
    }
    const openPicker = () => {
      const input = inputRef.current
      if (!input || typeof input.showPicker !== "function") return
      try {
        input.showPicker()
      } catch {
        input.focus()
      }
    }
    const handleClick = (event: React.MouseEvent<HTMLInputElement>) => {
      onClick?.(event)
      if (!event.defaultPrevented && supportsPicker) openPicker()
    }

  return (
    <input
      ref={setRef}
      type={type}
      data-slot="input"
      onClick={handleClick}
      className={cn(
        "file:text-foreground placeholder:text-muted-foreground selection:bg-primary selection:text-primary-foreground dark:bg-input/30 border-input h-9 w-full min-w-0 rounded-md border bg-transparent px-3 py-1 text-base shadow-xs transition-[color,box-shadow] outline-none file:inline-flex file:h-7 file:border-0 file:bg-transparent file:text-sm file:font-medium disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 md:text-sm",
        "focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]",
        "aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
        supportsPicker && "[color-scheme:dark] cursor-pointer",
        className
      )}
      {...props}
    />
  )
  }
)

Input.displayName = "Input"

export { Input }
