import { ArrowDownRight, ArrowUpRight, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkline } from "@/components/common/sparkline";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "income" | "expense" | "warning" | "critical";

const TILE: Record<Tone, string> = {
  neutral: "bg-primary/12 text-primary",
  income: "bg-income/12 text-income",
  expense: "bg-expense/12 text-expense",
  warning: "bg-status-serious/15 text-status-serious",
  critical: "bg-status-critical/12 text-status-critical",
};

const LINE: Record<Tone, string> = {
  neutral: "var(--color-primary)",
  income: "var(--income)",
  expense: "var(--expense)",
  warning: "var(--status-serious)",
  critical: "var(--status-critical)",
};

/**
 * Stat tile: tinted icon tile, title, hero value, change vs previous period
 * and an optional sparkline. Numbers stay in text tokens; colour carries
 * meaning only on the tile, the trend line and the delta.
 */
export function SummaryCard({
  title,
  value,
  hint,
  icon: Icon,
  tone = "neutral",
  delta,
  sparkline,
  className,
}: {
  title: string;
  value: string;
  hint?: React.ReactNode;
  icon?: LucideIcon;
  tone?: Tone;
  delta?: { value: number | null; label: string; invert?: boolean } | null;
  sparkline?: number[];
  className?: string;
}) {
  const id = title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <Card className={cn("py-4", className)}>
      <CardContent className="flex items-start gap-3.5 px-4">
        {Icon ? (
          <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", TILE[tone])} aria-hidden="true">
            <Icon className="size-[18px]" />
          </span>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="line-clamp-2 text-[13px] leading-snug text-muted-foreground">{title}</div>
          <div className="tabular mt-0.5 text-xl leading-tight font-semibold tracking-tight break-words">{value}</div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <div className="min-w-0">
              {delta ? <DeltaLine delta={delta} /> : null}
              {hint ? <div className={cn("text-xs text-muted-foreground", delta && "mt-0.5")}>{hint}</div> : null}
            </div>
            {sparkline && sparkline.length > 1 ? (
              <div className="shrink-0 text-muted-foreground">
                <Sparkline id={id} data={sparkline} stroke={LINE[tone]} width={72} height={28} />
              </div>
            ) : null}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function DeltaLine({ delta }: { delta: { value: number | null; label: string; invert?: boolean } }) {
  if (delta.value === null) return <div className="text-xs text-muted-foreground">No comparison data</div>;
  const good = delta.invert ? delta.value <= 0 : delta.value >= 0;
  const Arrow = delta.value >= 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <div className="flex flex-wrap items-center gap-x-1.5 text-xs">
      <span className={cn("tabular inline-flex items-center gap-0.5 font-semibold", good ? "text-status-good" : "text-status-critical")}>
        <Arrow className="size-3.5" aria-hidden="true" />
        {Math.abs(delta.value).toFixed(1)}%
      </span>
      <span className="text-muted-foreground">{delta.label}</span>
    </div>
  );
}
