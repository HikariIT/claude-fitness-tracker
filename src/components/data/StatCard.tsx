import { useFormatter } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type StatCardProps = {
  label: string;
  value: number;
  unit?: string;
  hint?: string;
  maximumFractionDigits?: number;
  signDisplay?: "auto" | "exceptZero";
  className?: string;
};

export function StatCard({
  label,
  value,
  unit,
  hint,
  maximumFractionDigits = 0,
  signDisplay = "auto",
  className,
}: StatCardProps) {
  const format = useFormatter();
  return (
    <Card className={cn("bg-platinum-900 py-4", className)}>
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-hand text-3xl tabular-nums text-primary">
          {format.number(value, { maximumFractionDigits, signDisplay })}
          {unit ? <span className="ml-1 text-lg text-muted-foreground">{unit}</span> : null}
        </p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
