"use client"

import type { ReactNode } from "react"
import { useFormStatus } from "react-dom"
import { Button } from "@/components/ui/button"

type SubmitButtonProps = {
  children: ReactNode
  pendingLabel: string
}

export function SubmitButton({ children, pendingLabel }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" disabled={pending} aria-disabled={pending}>
      {pending ? pendingLabel : children}
    </Button>
  )
}
