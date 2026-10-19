"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import type { CategoryRow, CategoryType } from "@/lib/types/database";
import { categorySchema, type CategoryInput } from "@/lib/validation/categories";
import { createCategoryAction, updateCategoryAction } from "@/lib/actions/categories";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { FormSelect } from "@/components/common/form-select";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{category ? "Edit category" : "New category"}</DialogTitle>
          <DialogDescription>Custom categories appear next to the default ones in forms, budgets and reports.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate aria-busy={pending} className="flex flex-col gap-5">
          {formError ? (
            <Alert variant="destructive">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <FieldGroup className="gap-5">
            <Field data-invalid={!!errors.name}>
              <FieldLabel htmlFor="cat-name">Name</FieldLabel>
              <Input id="cat-name" autoFocus placeholder="e.g. Chai" aria-invalid={!!errors.name} {...form.register("name")} />
              <FieldError errors={[errors.name]} />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field data-invalid={!!errors.type}>
                <FieldLabel htmlFor="cat-type">Type</FieldLabel>
                <Controller
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormSelect
                      id="cat-type"
                      value={field.value}
                      onValueChange={(v) => {
                        field.onChange(v);
                        form.setValue("parentId", "");
                      }}
                      disabled={hasChildren}
                      invalid={!!errors.type}
                      options={[
                        { value: "expense", label: "Expense", text: "Expense", icon: <ArrowDownRight className="text-expense" /> },
                        { value: "income", label: "Income", text: "Income", icon: <ArrowUpRight className="text-income" /> },
                      ]}
                    />
                  )}
                />
                {hasChildren ? <FieldDescription>Type is fixed while subcategories exist.</FieldDescription> : null}
                <FieldError errors={[errors.type]} />
              </Field>
              <Field data-invalid={!!errors.parentId}>
                <FieldLabel htmlFor="cat-parent">Parent category</FieldLabel>
                <Controller
                  control={form.control}
                  name="parentId"
                  render={({ field }) => (
                    <FormSelect
                      id="cat-parent"
                      value={field.value ?? ""}
                      onValueChange={field.onChange}
                      disabled={hasChildren}
                      invalid={!!errors.parentId}
                      emptyLabel="None (main category)"
                      placeholder="None (main category)"
                      options={parentOptions.map((p) => ({ value: p.id, label: p.name, text: p.name, icon: <CategoryIcon icon={p.icon} color={p.color} size="sm" /> }))}
                    />
                  )}
                />
                <FieldDescription>Nest under a default or custom main category.</FieldDescription>
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
            <div className="flex items-center gap-3 rounded-xl border bg-muted/30 p-3 text-sm">
              <CategoryIcon icon={icon} color={color || null} size="lg" />
              <div className="flex flex-col">
                <span className="text-xs text-muted-foreground">Preview</span>
                <span className="font-medium text-foreground">{form.watch("name") || "Category name"}</span>
              </div>
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
