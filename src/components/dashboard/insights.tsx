import { Lightbulb } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** Plain-language observations computed from real data only. */
export function Insights({ items }: { items: string[] }) {
  if (items.length === 0) return null;
  return (
    <Card className="gap-3">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Lightbulb className="size-4 text-status-warning" aria-hidden="true" />
          Insights
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="flex list-disc flex-col gap-1.5 pl-5 text-sm">
          {items.map((text, i) => (
            <li key={i}>{text}</li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
