"use client";

import { usePathname } from "next/navigation";
import { pageTitleFor } from "@/components/layout/page-titles";

/** Current module title + description, rendered inside the sticky top bar. */
export function HeaderTitle() {
  const pathname = usePathname();
  const { title, description } = pageTitleFor(pathname);
  return (
    <div className="min-w-0 flex-1">
      <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h1>
      {description ? <p className="hidden truncate text-xs text-muted-foreground md:block">{description}</p> : null}
    </div>
  );
}
