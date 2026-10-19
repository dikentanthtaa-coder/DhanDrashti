"use client";

import { useSearchParams } from "next/navigation";
import { Download, FileSpreadsheet, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/** Export the currently selected filters and range (read from the URL). */
export function ReportExportMenu() {
  const params = useSearchParams();
  const qs = params.toString();
  const txHref = `/api/export/transactions${qs ? `?${qs}` : ""}`;
  const summaryHref = `/api/export/transactions?summary=1${qs ? `&${qs}` : ""}`;
  const printHref = `/reports/print${qs ? `?${qs}` : ""}`;
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline">
          <Download data-icon="inline-start" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>Uses the current filters</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={txHref} download>
            <FileSpreadsheet /> Export transactions (CSV)
          </a>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <a href={summaryHref} download>
            <FileSpreadsheet /> Export summary (CSV)
          </a>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <a href={printHref} target="_blank" rel="noopener">
            <Printer /> Print-friendly report
          </a>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
