import type { ReactNode } from "react"
import { Label } from "@/components/ui/label"

type FormFieldProps = {
  id: string
  label: string
  hint?: string
  error?: string
  children: ReactNode
}

export function FormField({ id, label, hint, error, children }: FormFieldProps) {
  return (
    // Every row is one ruled line tall (h-9 / leading-9). The label is written on the line
    // directly above its control, so label and field read as one unit. Flex column: an inline
    // <input> would sit on a text baseline and add a fraction of a pixel per row, drifting off the ruling.
    <div className="flex flex-col">
      <Label htmlFor={id} className="h-9 items-end pb-1.5">
        {label}
      </Label>
      {children}
      {hint ? (
        <p id={`${id}-hint`} className="text-xs leading-9 text-muted-foreground">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm leading-9 text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
