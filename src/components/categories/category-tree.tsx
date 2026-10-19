"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore, ArrowDown, ArrowUp, Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CategoryRow, CategoryType } from "@/lib/types/database";
import { deleteCategoryAction, reorderCategoriesAction, setCategoryArchivedAction } from "@/lib/actions/categories";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CategoryIcon } from "@/components/common/category-icon";
import { ConfirmationDialog } from "@/components/common/confirmation-dialog";
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";
import { cn } from "@/lib/utils";

export function CategoryTree({ categories, type, showArchived }: { categories: CategoryRow[]; type: CategoryType; showArchived: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const ofType = categories.filter((c) => c.type === type && (showArchived || !c.is_archived));
  const parents = ofType.filter((c) => !c.parent_id);
  const childrenOf = (id: string) => ofType.filter((c) => c.parent_id === id);
  const ownOrdered = categories.filter((c) => !c.is_system).sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name));

  const run = (fn: () => Promise<{ ok: boolean; error?: string; message?: string }>) =>
    startTransition(async () => {
      const r = await fn();
      if (!r.ok) toast.error(r.error ?? "Failed");
      else {
        toast.success(r.message ?? "Done");
        router.refresh();
      }
    });

  const move = (cat: CategoryRow, direction: -1 | 1) => {
    // Reorder among own categories that share the same parent and type.
    const siblings = ownOrdered.filter((c) => c.type === cat.type && (c.parent_id ?? null) === (cat.parent_id ?? null));
    const index = siblings.findIndex((c) => c.id === cat.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    const reordered = [...siblings];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    const others = ownOrdered.filter((c) => !siblings.some((s) => s.id === c.id));
    run(() => reorderCategoriesAction({ orderedIds: [...reordered, ...others].map((c) => c.id) }));
  };

  if (parents.length === 0) {
    return <p className="text-sm text-muted-foreground">No {type} categories yet.</p>;
  }

  const renderRow = (cat: CategoryRow, parent: CategoryRow | null) => {
    const own = !cat.is_system;
    const siblings = own ? ownOrdered.filter((c) => c.type === cat.type && (c.parent_id ?? null) === (cat.parent_id ?? null)) : [];
    const idx = siblings.findIndex((c) => c.id === cat.id);
    return (
      <div className={cn("flex items-center gap-3 py-2", cat.is_archived && "opacity-60")} data-pending={pending || undefined}>
        <CategoryIcon icon={cat.icon ?? parent?.icon} color={cat.color ?? parent?.color} size={parent ? "sm" : "md"} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cn("truncate", parent ? "text-sm" : "font-medium")}>{cat.name}</span>
            {cat.is_system ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Badge variant="outline" className="gap-1 text-[10px]"><Lock className="size-2.5" aria-hidden="true" /> Default</Badge>
                </TooltipTrigger>
                <TooltipContent>Default categories are shared and cannot be edited. Add your own subcategories instead.</TooltipContent>
              </Tooltip>
            ) : (
              <Badge variant="secondary" className="text-[10px]">Custom</Badge>
            )}
            {cat.is_archived ? <Badge variant="outline" className="text-[10px]">Archived</Badge> : null}
          </div>
        </div>
        <div className="flex items-center gap-0.5">
          {!parent ? (
            <CategoryFormDialog
              categories={categories}
              defaultType={type}
              defaultParentId={cat.id}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label={`Add subcategory to ${cat.name}`}>
                  <Plus />
                </Button>
              }
            />
          ) : null}
          {own ? (
            <>
              <Button variant="ghost" size="icon-sm" aria-label="Move up" disabled={pending || idx <= 0} onClick={() => move(cat, -1)}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Move down" disabled={pending || idx < 0 || idx >= siblings.length - 1} onClick={() => move(cat, 1)}>
                <ArrowDown />
              </Button>
              <CategoryFormDialog
                categories={categories}
                category={cat}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Edit ${cat.name}`}>
                    <Pencil />
                  </Button>
                }
              />
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label={cat.is_archived ? `Restore ${cat.name}` : `Archive ${cat.name}`}
                disabled={pending}
                onClick={() => run(() => setCategoryArchivedAction(cat.id, !cat.is_archived))}
              >
                {cat.is_archived ? <ArchiveRestore /> : <Archive />}
              </Button>
              <ConfirmationDialog
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Delete ${cat.name}`} disabled={pending}>
                    <Trash2 />
                  </Button>
                }
                title={`Delete "${cat.name}"?`}
                description="Categories that are used by transactions, budgets or schedules cannot be deleted — archive those instead. Subcategories are deleted along with their parent."
                confirmLabel="Delete"
                destructive
                onConfirm={async () => {
                  const r = await deleteCategoryAction(cat.id);
                  if (!r.ok) toast.error(r.error);
                  else {
                    toast.success(r.message ?? "Deleted");
                    router.refresh();
                  }
                }}
              />
            </>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <ul className="divide-y">
      {parents.map((p) => (
        <li key={p.id}>
          {renderRow(p, null)}
          {childrenOf(p.id).length > 0 ? (
            <ul className="mb-2 ml-6 divide-y border-l pl-4">
              {childrenOf(p.id).map((c) => (
                <li key={c.id}>{renderRow(c, p)}</li>
              ))}
            </ul>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
