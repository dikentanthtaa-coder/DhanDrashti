import Link from "next/link";
import { PiggyBank } from "lucide-react";
import type { GoalWithProgress } from "@/lib/data/savings";
import { percentOf } from "@/lib/finance/money";
import { formatINR } from "@/lib/finance/money";
import { formatDisplayDate } from "@/lib/finance/dates";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { EmptyState } from "@/components/common/empty-state";

export function SavingsGoalsWidget({ goals }: { goals: GoalWithProgress[] }) {
  const active = goals.filter((g) => g.status === "active").slice(0, 4);
  return (
    <Card className="gap-3">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="text-base">Savings goals</CardTitle>
          <CardDescription>Progress from tagged contributions, not account balances.</CardDescription>
        </div>
        <Button asChild variant="ghost" size="sm" className="no-print">
          <Link href="/savings">Planner</Link>
        </Button>
      </CardHeader>
      <CardContent>
        {active.length === 0 ? (
          <EmptyState
            icon={PiggyBank}
            title="No savings goals"
            description="Set a goal with a target amount and date, then tag transfers as contributions."
            action={
              <Button asChild size="sm" variant="outline">
                <Link href="/savings">Create a goal</Link>
              </Button>
            }
          />
        ) : (
          <ul className="flex flex-col gap-3">
            {active.map((g) => {
              const pct = Math.min(100, percentOf(g.saved, g.target_amount));
              return (
                <li key={g.id}>
                  <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                    <span className="truncate font-medium">{g.name}</span>
                    <span className="tabular text-muted-foreground">
                      {formatINR(g.saved)} / {formatINR(g.target_amount)}
                    </span>
                  </div>
                  <Progress value={pct} aria-label={`${g.name} ${pct.toFixed(0)}% saved`} />
                  <div className="mt-1 text-xs text-muted-foreground">
                    {pct.toFixed(0)}% saved{g.target_date ? ` · target ${formatDisplayDate(g.target_date)}` : ""}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
