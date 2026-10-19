import type { Metadata } from "next";
import { requireUser } from "@/lib/auth/session";
import { listCategories } from "@/lib/data/categories";
import { PageHeader } from "@/components/common/page-header";
import { CategoriesManager } from "@/components/categories/categories-manager";

export const metadata: Metadata = { title: "Categories" };

export default async function CategoriesPage() {
  await requireUser();
  const categories = await listCategories();
  return (
    <div className="flex flex-col gap-4">
      <PageHeader
        title="Categories"
        description="Default categories cover everyday Indian spending. Add your own main categories or subcategories, reorder them, and archive what you don't use."
      />
      <CategoriesManager categories={categories} />
    </div>
  );
}
