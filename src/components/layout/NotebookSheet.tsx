import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type NotebookSheetProps = {
  children: ReactNode;
  className?: string;
};

export function NotebookSheet({ children, className }: NotebookSheetProps) {
  return (
    <section
      className={cn(
        "notebook-paper rounded-b-md rounded-tr-md border border-border shadow-sm",
        "pl-12 pr-6 sm:pl-20 sm:pr-12 py-9 min-h-[70vh] leading-9",
        className,
      )}
    >
      {children}
    </section>
  );
}
