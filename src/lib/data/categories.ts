import "server-only";

import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { CategoryRow, CategoryType } from "@/lib/types/database";

export interface CategoryNode extends CategoryRow {
  children: CategoryRow[];
}

/** All visible categories (global + own), ordered for display. */
export const listCategories = cache(async (): Promise<CategoryRow[]> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("categories")
    .select("*")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  return data ?? [];
});

export function buildCategoryTree(rows: CategoryRow[], type?: CategoryType, includeArchived = false): CategoryNode[] {
  const filtered = rows.filter((c) => (!type || c.type === type) && (includeArchived || !c.is_archived));
  const parents = filtered.filter((c) => !c.parent_id);
  const byParent = new Map<string, CategoryRow[]>();
  for (const c of filtered) {
    if (c.parent_id) {
      const list = byParent.get(c.parent_id) ?? [];
      list.push(c);
      byParent.set(c.parent_id, list);
    }
  }
  return parents.map((p) => ({ ...p, children: byParent.get(p.id) ?? [] }));
}

export async function getCategoryTree(type?: CategoryType, includeArchived = false): Promise<CategoryNode[]> {
  return buildCategoryTree(await listCategories(), type, includeArchived);
}

export function categoryMap(rows: CategoryRow[]): Map<string, CategoryRow> {
  return new Map(rows.map((c) => [c.id, c]));
}

/** Display name "Parent › Child" for a category id. */
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
