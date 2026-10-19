import { cn } from "@/lib/utils";

/**
 * In-page header row. The module title and its standard description are shown
 * in the sticky top bar; this renders the actions (and an optional contextual
 * line such as a greeting or date range when `showDescription` is set).
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
  showDescription = false,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
  showDescription?: boolean;
}) {
  return (
    <div className={cn("mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="min-w-0">
        <h2 className="sr-only">{title}</h2>
        {showDescription && description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {actions ? <div className="no-print flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
