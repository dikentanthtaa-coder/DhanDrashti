"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import type { CategoryRow, CategoryType } from "@/lib/types/database";
import { categorySchema, type CategoryInput } from "@/lib/validation/categories";
import { createCategoryAction, updateCategoryAction } from "@/lib/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { Spinner } from "@/components/ui/spinner";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/common/category-icon";
import { cn } from "@/lib/utils";

type CategoryValues = ReturnType<typeof categorySchema.parse>;

export const CATEGORY_COLORS = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#6250d6", "#e34948", "#0e7490", "#b45309", "#be185d", "#475569", "#92400e", "#1d4ed8", "#c2410c", "#4338ca", "#334155", "#898781"];

export function CategoryFormDialog({
  categories,
  category,
  defaultType = "expense",
  defaultParentId = null,
  trigger,
}: {
  categories: CategoryRow[];
  category?: CategoryRow | null;
  defaultType?: CategoryType;
  defaultParentId?: string | null;
  trigger: React.ReactNode;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const [formError, setFormError] = React.useState<string | null>(null);

  const defaults: CategoryInput = {
    name: category?.name ?? "",
    type: category?.type ?? defaultType,
    parentId: category?.parent_id ?? defaultParentId ?? "",
    icon: category?.icon ?? "tag",
    color: category?.color ?? CATEGORY_COLORS[0],
  };
  const form = useForm<CategoryInput, unknown, CategoryValues>({ resolver: zodResolver(categorySchema), defaultValues: defaults });
  const { errors } = form.formState;
  const type = form.watch("type");
  const icon = form.watch("icon");
  const color = form.watch("color");
  const parentOptions = categories.filter((c) => c.type === type && !c.parent_id && !c.is_archived && c.id !== category?.id);
  const hasChildren = category ? categories.some((c) => c.parent_id === category.id) : false;

  const onSubmit = form.handleSubmit((values) => {
    setFormError(null);
    startTransition(async () => {
      const r = category ? await updateCategoryAction(category.id, values) : await createCategoryAction(values);
      if (!r.ok) {
        setFormError(r.error);
        if (r.fieldErrors) for (const [f, m] of Object.entries(r.fieldErrors)) form.setError(f as keyof CategoryInput, { message: m[0] });
        return;
      }
      toast.success(r.message ?? "Saved");
      setOpen(false);
      form.reset(defaults);
      router.refresh();
    });
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { form.reset(defaults); setFormError(null); } }}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Custom categories appear next to the default ones in forms, budgets and reports.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate aria-busy={pending} className="flex flex-col gap-4">
          {formError ? <p role="alert" className="text-sm text-destructive">{formError}</p> : null}
          <FieldGroup>
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="cat-name">Name</FieldLabel>
              <Input id="cat-name" autoFocus aria-invalid={!!errors.name} {...form.register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field data-invalid={!!errors.type}>
                <FieldLabel htmlFor="cat-type">Type</FieldLabel>
                <NativeSelect id="cat-type" disabled={hasChildren} {...form.register("type", { onChange: () => form.setValue("parentId", "") })}>
                  <NativeSelectOption value="expense">Expense</NativeSelectOption>
                  <NativeSelectOption value="income">Income</NativeSelectOption>
                </NativeSelect>
                {hasChildren ? <FieldDescription>Type is fixed while subcategories exist.</FieldDescription> : null}
                <FieldError errors={[errors.type]} />
              </Field>
              <Field data-invalid={!!errors.parentId}>
                <FieldLabel htmlFor="cat-parent">Parent category</FieldLabel>
                <NativeSelect id="cat-parent" disabled={hasChildren} {...form.register("parentId")}>
                  <NativeSelectOption value="">None (main category)</NativeSelectOption>
                  {parentOptions.map((p) => (
                    <NativeSelectOption key={p.id} value={p.id}>
                      {p.name}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
                <FieldError errors={[errors.parentId]} />
              </Field>
            </div>
            <Field data-invalid={!!errors.color}>
              <FieldLabel>Colour</FieldLabel>
              <Controller
                control={form.control}
                name="color"
                render={({ field }) => (
                  <div role="radiogroup" aria-label="Colour" className="flex flex-wrap gap-2">
                    {CATEGORY_COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        role="radio"
                        aria-checked={field.value === c}
                        aria-label={c}
                        onClick={() => field.onChange(c)}
                        className={cn("size-7 rounded-full border-2 outline-none focus-visible:ring-3 focus-visible:ring-ring/50", field.value === c ? "border-foreground" : "border-transparent")}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                )}
              />
              <FieldError errors={[errors.color]} />
            </Field>
            <Field data-invalid={!!errors.icon}>
              <FieldLabel>Icon</FieldLabel>
              <Controller
                control={form.control}
                name="icon"
                render={({ field }) => (
                  <div role="radiogroup" aria-label="Icon" className="grid max-h-40 grid-cols-8 gap-1.5 overflow-y-auto rounded-lg border p-2">
                    {CATEGORY_ICON_NAMES.map((name) => (
                      <button
                        key={name}
                        type="button"
                        role="radio"
                        aria-checked={field.value === name}
                        aria-label={name}
                        onClick={() => field.onChange(name)}
                        className={cn("flex items-center justify-center rounded-md p-1 outline-none hover:bg-muted focus-visible:ring-3 focus-visible:ring-ring/50", field.value === name && "ring-2 ring-primary")}
                      >
                        <CategoryIcon icon={name} color={color || null} size="sm" />
                      </button>
                    ))}
                  </div>
                )}
              />
              <FieldError errors={[errors.icon]} />
            </Field>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              Preview: <CategoryIcon icon={icon} color={color || null} /> <span className="text-foreground">{form.watch("name") || "Category name"}</span>
            </div>
          </FieldGroup>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? <Spinner /> : null}
              {category ? "Save changes" : "Create category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
