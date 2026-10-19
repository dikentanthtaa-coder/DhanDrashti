import type { CategoryRow } from "@/lib/types/database";

/** Client-safe helpers (no server-only import) mirroring src/lib/data/categories.ts. */
export function categoryMap(rows: CategoryRow[]): Map<string, CategoryRow> {
  return new Map(rows.map((c) => [c.id, c]));
}

export function categoryLabel(map: Map<string, CategoryRow>, id: string | null): string {
  if (!id) return "—";
  const c = map.get(id);
  if (!c) return "—";
  if (c.parent_id) {
    const p = map.get(c.parent_id);
    return p ? `${p.name} › ${c.name}` : c.name;
  }
  return c.name;
}
