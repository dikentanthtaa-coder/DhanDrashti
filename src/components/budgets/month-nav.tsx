import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { addMonthsToDateString, formatMonthLabel } from "@/lib/finance/dates";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MonthNav({ month, basePath, currentMonth }: { month: string; basePath: string; currentMonth: string }) {
  const prev = addMonthsToDateString(month, -1);
  const next = addMonthsToDateString(month, 1);
  return (
    <nav className="flex items-center gap-1" aria-label="Month navigation">
      <Link href={`${basePath}?month=${prev}`} className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))} aria-label={`Previous month, ${formatMonthLabel(prev)}`}>
        <ChevronLeft />
      </Link>
      <span className="min-w-28 text-center text-sm font-medium tabular" aria-live="polite">
        {formatMonthLabel(month)}
      </span>
      <Link href={`${basePath}?month=${next}`} className={cn(buttonVariants({ variant: "outline", size: "icon-sm" }))} aria-label={`Next month, ${formatMonthLabel(next)}`}>
        <ChevronRight />
      </Link>
      {month !== currentMonth ? (
        <Link href={basePath} className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}>
          This month
        </Link>
      ) : null}
    </nav>
  );
}
