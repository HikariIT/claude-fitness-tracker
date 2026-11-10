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
        "pl-10 pr-4 sm:pl-16 sm:pr-8 py-7 min-h-[70vh] leading-7",
        className,
      )}
    >
      {children}
    </section>
  );
}
