import type { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: LucideIcon;
};

export function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center">
      {Icon ? <Icon className="my-2 size-10 text-steel-blue-400" aria-hidden="true" /> : null}
      <h2 className="font-hand text-2xl leading-7 text-primary">{title}</h2>
      {description ? <p className="max-w-md text-muted-foreground">{description}</p> : null}
    </div>
  );
}
