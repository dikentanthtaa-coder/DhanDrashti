import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { SavingsGoalProgress, SavingsGoalRow } from "@/lib/types/database";

export interface GoalWithProgress extends SavingsGoalRow {
  saved: number;
  contribution_count: number;
  last_contribution: string | null;
}

export async function listSavingsGoals(options?: { includeArchived?: boolean }): Promise<GoalWithProgress[]> {
  const supabase = await createClient();
  const [{ data: goals }, { data: progress }] = await Promise.all([
    supabase.from("savings_goals").select("*").order("created_at", { ascending: true }),
    supabase.rpc("savings_goal_progress"),
  ]);
  const byGoal = new Map<string, SavingsGoalProgress>((progress ?? []).map((p) => [p.goal_id, p]));
  return (goals ?? [])
    .filter((g) => options?.includeArchived || g.status !== "archived")
    .map((g) => {
      const p = byGoal.get(g.id);
      return {
        ...g,
        saved: Number(p?.saved ?? 0),
        contribution_count: Number(p?.contribution_count ?? 0),
        last_contribution: p?.last_contribution ?? null,
      };
    });
}

export async function getSavingsGoal(id: string): Promise<GoalWithProgress | null> {
  const goals = await listSavingsGoals({ includeArchived: true });
  return goals.find((g) => g.id === id) ?? null;
}
