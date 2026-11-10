import { useFormatter } from "next-intl";
import { Card, CardContent } from "@/components/ui/card";

type StatCardProps = {
  label: string;
  value: number;
  unit?: string;
  hint?: string;
  maximumFractionDigits?: number;
};

export function StatCard({ label, value, unit, hint, maximumFractionDigits = 0 }: StatCardProps) {
  const format = useFormatter();
  return (
    <Card className="bg-platinum-900 py-4">
      <CardContent className="space-y-1">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="font-hand text-3xl tabular-nums text-primary">
          {format.number(value, { maximumFractionDigits })}
          {unit ? <span className="ml-1 text-lg text-muted-foreground">{unit}</span> : null}
        </p>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  );
}
