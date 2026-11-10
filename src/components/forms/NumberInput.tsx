import type * as React from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"
import { fieldControlClass } from "./field-styles"

type NumberInputProps = Omit<React.ComponentProps<typeof Input>, "type" | "value" | "onChange"> & {
  value: string
  onChange: (value: string) => void
  unit?: string
}

export function NumberInput({ value, onChange, unit, className, ...rest }: NumberInputProps) {
  return (
    <div className="relative flex">
      <Input
        type="text"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        {...rest}
        className={cn(fieldControlClass, unit ? "pr-12" : undefined, className)}
      />
      {unit ? (
        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">
          {unit}
        </span>
      ) : null}
    </div>
  )
}
