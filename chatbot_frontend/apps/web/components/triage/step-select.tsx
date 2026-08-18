"use client"

import { cn } from "@workspace/ui/lib/utils"

interface StepSelectProps {
  options: readonly string[]
  value: string
  onSelect: (value: string) => void
}

function StepSelect({ options, value, onSelect }: StepSelectProps) {
  return (
    <div className="mt-6 flex flex-col gap-4">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === option}
          onClick={() => onSelect(option)}
          className={cn(
            "w-full rounded-2xl border px-6 py-4 text-left text-lg transition-colors",
            value === option
              ? "border-primary bg-primary/10 text-foreground"
              : "border-border bg-background text-foreground hover:bg-muted"
          )}
        >
          {option}
        </button>
      ))}
    </div>
  )
}

export { StepSelect }
