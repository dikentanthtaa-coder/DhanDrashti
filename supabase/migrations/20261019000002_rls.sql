-- =============================================================================
-- DhanDrashti · 0002 · Row Level Security
-- Every private table: RLS enabled, explicit per-command policies, ownership
-- via auth.uid(). Related-record ownership (accounts/categories/goals/schedules)
-- is validated in WITH CHECK so a user can never attach their rows to another
-- user's records even if they know the UUID.
-- =============================================================================

-- Helper: does the current user own this account?
create or replace function public.owns_account(p_account_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.accounts a
    where a.id = p_account_id and a.user_id = (select auth.uid())
  );
$$;

-- Helper: may the current user use this category (global, or their own)?
create or replace function public.can_use_category(p_category_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.categories c
    where c.id = p_category_id
      and (c.is_system = true or c.user_id = (select auth.uid()))
  );
$$;

create or replace function public.owns_savings_goal(p_goal_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.savings_goals g
    where g.id = p_goal_id and g.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_recurring(p_recurring_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.recurring_transactions r
    where r.id = p_recurring_id and r.user_id = (select auth.uid())
  );
$$;

create or replace function public.owns_budget(p_budget_id uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.budgets b
    where b.id = p_budget_id and b.user_id = (select auth.uid())
  );
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.profiles force row level security;

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert to authenticated
  with check (id = (select auth.uid()));

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Profiles are removed via auth.users cascade (account deletion); no direct delete.

-- -----------------------------------------------------------------------------
-- accounts
-- -----------------------------------------------------------------------------
alter table public.accounts enable row level security;
alter table public.accounts force row level security;

drop policy if exists "accounts: select own" on public.accounts;
create policy "accounts: select own" on public.accounts
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "accounts: insert own" on public.accounts;
create policy "accounts: insert own" on public.accounts
  for insert to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "accounts: update own" on public.accounts;
create policy "accounts: update own" on public.accounts
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "accounts: delete own" on public.accounts;
create policy "accounts: delete own" on public.accounts
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- categories: global rows readable by everyone signed in; only own rows writable
-- -----------------------------------------------------------------------------
alter table public.categories enable row level security;
alter table public.categories force row level security;

drop policy if exists "categories: select global or own" on public.categories;
create policy "categories: select global or own" on public.categories
  for select to authenticated
  using (is_system = true or user_id = (select auth.uid()));

drop policy if exists "categories: insert own" on public.categories;
create policy "categories: insert own" on public.categories
  for insert to authenticated
  with check (
    is_system = false
    and user_id = (select auth.uid())
    and (parent_id is null or public.can_use_category(parent_id))
  );

drop policy if exists "categories: update own" on public.categories;
create policy "categories: update own" on public.categories
  for update to authenticated
  using (is_system = false and user_id = (select auth.uid()))
  with check (
    is_system = false
    and user_id = (select auth.uid())
    and (parent_id is null or public.can_use_category(parent_id))
  );

drop policy if exists "categories: delete own" on public.categories;
create policy "categories: delete own" on public.categories
  for delete to authenticated
  using (is_system = false and user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- savings_goals
-- -----------------------------------------------------------------------------
alter table public.savings_goals enable row level security;
alter table public.savings_goals force row level security;

drop policy if exists "savings_goals: select own" on public.savings_goals;
create policy "savings_goals: select own" on public.savings_goals
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "savings_goals: insert own" on public.savings_goals;
create policy "savings_goals: insert own" on public.savings_goals
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (account_id is null or public.owns_account(account_id))
  );

drop policy if exists "savings_goals: update own" on public.savings_goals;
create policy "savings_goals: update own" on public.savings_goals
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (account_id is null or public.owns_account(account_id))
  );

drop policy if exists "savings_goals: delete own" on public.savings_goals;
create policy "savings_goals: delete own" on public.savings_goals
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- recurring_transactions
-- -----------------------------------------------------------------------------
alter table public.recurring_transactions enable row level security;
alter table public.recurring_transactions force row level security;

drop policy if exists "recurring: select own" on public.recurring_transactions;
create policy "recurring: select own" on public.recurring_transactions
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "recurring: insert own" on public.recurring_transactions;
create policy "recurring: insert own" on public.recurring_transactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.owns_account(account_id)
    and (to_account_id is null or public.owns_account(to_account_id))
    and (category_id is null or public.can_use_category(category_id))
  );

drop policy if exists "recurring: update own" on public.recurring_transactions;
create policy "recurring: update own" on public.recurring_transactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.owns_account(account_id)
    and (to_account_id is null or public.owns_account(to_account_id))
    and (category_id is null or public.can_use_category(category_id))
  );

drop policy if exists "recurring: delete own" on public.recurring_transactions;
create policy "recurring: delete own" on public.recurring_transactions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- transactions
-- -----------------------------------------------------------------------------
alter table public.transactions enable row level security;
alter table public.transactions force row level security;

drop policy if exists "transactions: select own" on public.transactions;
create policy "transactions: select own" on public.transactions
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "transactions: insert own" on public.transactions;
create policy "transactions: insert own" on public.transactions
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and public.owns_account(account_id)
    and (to_account_id is null or public.owns_account(to_account_id))
    and (category_id is null or public.can_use_category(category_id))
    and (savings_goal_id is null or public.owns_savings_goal(savings_goal_id))
    and (recurring_transaction_id is null or public.owns_recurring(recurring_transaction_id))
  );

drop policy if exists "transactions: update own" on public.transactions;
create policy "transactions: update own" on public.transactions
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and public.owns_account(account_id)
    and (to_account_id is null or public.owns_account(to_account_id))
    and (category_id is null or public.can_use_category(category_id))
    and (savings_goal_id is null or public.owns_savings_goal(savings_goal_id))
    and (recurring_transaction_id is null or public.owns_recurring(recurring_transaction_id))
  );

drop policy if exists "transactions: delete own" on public.transactions;
create policy "transactions: delete own" on public.transactions
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- recurring_transaction_occurrences
-- -----------------------------------------------------------------------------
alter table public.recurring_transaction_occurrences enable row level security;
alter table public.recurring_transaction_occurrences force row level security;

drop policy if exists "occurrences: select own" on public.recurring_transaction_occurrences;
create policy "occurrences: select own" on public.recurring_transaction_occurrences
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "occurrences: insert own" on public.recurring_transaction_occurrences;
create policy "occurrences: insert own" on public.recurring_transaction_occurrences
  for insert to authenticated
  with check (user_id = (select auth.uid()) and public.owns_recurring(recurring_transaction_id));

drop policy if exists "occurrences: update own" on public.recurring_transaction_occurrences;
create policy "occurrences: update own" on public.recurring_transaction_occurrences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()) and public.owns_recurring(recurring_transaction_id));

drop policy if exists "occurrences: delete own" on public.recurring_transaction_occurrences;
create policy "occurrences: delete own" on public.recurring_transaction_occurrences
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- budgets
-- -----------------------------------------------------------------------------
alter table public.budgets enable row level security;
alter table public.budgets force row level security;

drop policy if exists "budgets: select own" on public.budgets;
create policy "budgets: select own" on public.budgets
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "budgets: insert own" on public.budgets;
create policy "budgets: insert own" on public.budgets
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (category_id is null or public.can_use_category(category_id))
  );

drop policy if exists "budgets: update own" on public.budgets;
create policy "budgets: update own" on public.budgets
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (
    user_id = (select auth.uid())
    and (category_id is null or public.can_use_category(category_id))
  );

drop policy if exists "budgets: delete own" on public.budgets;
create policy "budgets: delete own" on public.budgets
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
alter table public.notifications enable row level security;
alter table public.notifications force row level security;

drop policy if exists "notifications: select own" on public.notifications;
create policy "notifications: select own" on public.notifications
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "notifications: insert own" on public.notifications;
create policy "notifications: insert own" on public.notifications
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (related_budget_id is null or public.owns_budget(related_budget_id))
    and (related_recurring_id is null or public.owns_recurring(related_recurring_id))
  );

drop policy if exists "notifications: update own" on public.notifications;
create policy "notifications: update own" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

drop policy if exists "notifications: delete own" on public.notifications;
create policy "notifications: delete own" on public.notifications
  for delete to authenticated
  using (user_id = (select auth.uid()));

-- -----------------------------------------------------------------------------
-- rate_limits: no direct access; only via SECURITY DEFINER function (0003)
-- -----------------------------------------------------------------------------
alter table public.rate_limits enable row level security;
alter table public.rate_limits force row level security;
revoke all on table public.rate_limits from anon, authenticated;

-- -----------------------------------------------------------------------------
-- The anon role gets nothing from private tables.
-- -----------------------------------------------------------------------------
revoke all on table public.profiles, public.accounts, public.categories, public.transactions,
  public.budgets, public.savings_goals, public.recurring_transactions,
  public.recurring_transaction_occurrences, public.notifications
from anon;
