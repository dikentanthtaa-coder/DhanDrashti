import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function SummaryCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  delta,
  className,
}: {
  title: string;
  value: string;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: "neutral" | "income" | "expense" | "warning" | "critical";
  delta?: { value: number | null; label: string; invert?: boolean } | null;
  className?: string;
}) {
  const toneClass =
    tone === "income"
      ? "text-income"
      : tone === "expense"
        ? "text-expense"
        : tone === "warning"
          ? "text-status-serious"
          : tone === "critical"
            ? "text-status-critical"
            : "text-foreground";
  return (
    <Card className={cn("gap-2 py-4", className)}>
      <CardContent className="flex flex-col gap-1 px-4">
        <div className="flex items-center justify-between gap-2 text-sm text-muted-foreground">
          <span className="truncate">{title}</span>
          {Icon ? <Icon className="size-4 shrink-0" aria-hidden="true" /> : null}
        </div>
        <div className={cn("truncate text-2xl font-semibold", toneClass)}>{value}</div>
        {delta ? <DeltaLine delta={delta} /> : null}
        {hint ? <div className="text-xs text-muted-foreground">{hint}</div> : null}
      </CardContent>
    </Card>
  );
}

function DeltaLine({ delta }: { delta: { value: number | null; label: string; invert?: boolean } }) {
  if (delta.value === null) return <div className="text-xs text-muted-foreground">No comparison data</div>;
  const good = delta.invert ? delta.value <= 0 : delta.value >= 0;
  const sign = delta.value > 0 ? "+" : "";
  return (
    <div className="flex items-center gap-1 text-xs">
      <span className={cn("font-medium tabular", good ? "text-status-good" : "text-status-critical")} aria-label={`${sign}${delta.value.toFixed(1)} percent`}>
        {sign}
        {delta.value.toFixed(1)}%
      </span>
      <span className="text-muted-foreground">{delta.label}</span>
    </div>
  );
}
