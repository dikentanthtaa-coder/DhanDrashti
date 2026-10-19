"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import type { CategoryRow } from "@/lib/types/database";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryTree } from "@/components/categories/category-tree";
import { CategoryFormDialog } from "@/components/categories/category-form-dialog";

export function CategoriesManager({ categories }: { categories: CategoryRow[] }) {
  const [showArchived, setShowArchived] = React.useState(false);
  const [tab, setTab] = React.useState<"expense" | "income">("expense");
  return (
    <Tabs value={tab} onValueChange={(v) => setTab(v as "expense" | "income")} className="gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <TabsList>
          <TabsTrigger value="expense">Expense</TabsTrigger>
          <TabsTrigger value="income">Income</TabsTrigger>
        </TabsList>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 rounded-lg border px-3 py-2">
            <Switch id="show-archived" checked={showArchived} onCheckedChange={setShowArchived} />
            <Label htmlFor="show-archived" className="text-sm">Show archived</Label>
          </div>
          <CategoryFormDialog
            categories={categories}
            defaultType={tab}
            trigger={
              <Button>
                <Plus data-icon="inline-start" /> New category
              </Button>
            }
          />
        </div>
      </div>
      <TabsContent value="expense">
        <Card>
          <CardContent>
            <CategoryTree categories={categories} type="expense" showArchived={showArchived} />
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="income">
        <Card>
          <CardContent>
            <CategoryTree categories={categories} type="income" showArchived={showArchived} />
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
}
