-- =============================================================================
-- DhanDrashti · 0001 · Core schema
-- Tables, constraints, indexes and triggers. RLS policies live in 0002.
-- All monetary values use NUMERIC(14,2); never floating point.
-- =============================================================================

create extension if not exists pgcrypto;
create extension if not exists btree_gist;

-- -----------------------------------------------------------------------------
-- Generic updated_at trigger
-- -----------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table if not exists public.profiles (
  id                    uuid primary key references auth.users (id) on delete cascade,
  display_name          text not null default '' check (char_length(display_name) <= 80),
  preferred_currency    char(3) not null default 'INR',
  timezone              text not null default 'Asia/Kolkata' check (char_length(timezone) <= 64),
  savings_target_type   text check (savings_target_type in ('fixed', 'percent')),
  savings_target_value  numeric(14,2) check (savings_target_value is null or savings_target_value >= 0),
  email_alerts_enabled  boolean not null default false,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- accounts
-- -----------------------------------------------------------------------------
create table if not exists public.accounts (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null check (char_length(btrim(name)) between 1 and 60),
  account_type     text not null check (account_type in ('cash', 'bank', 'savings', 'credit_card', 'other')),
  opening_balance  numeric(14,2) not null default 0,
  currency         char(3) not null default 'INR',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create unique index if not exists accounts_user_name_unique
  on public.accounts (user_id, lower(btrim(name)));
create index if not exists accounts_user_id_idx on public.accounts (user_id);

create trigger accounts_set_updated_at
  before update on public.accounts
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- categories (global system rows have user_id NULL and is_system TRUE)
-- -----------------------------------------------------------------------------
create table if not exists public.categories (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid references auth.users (id) on delete cascade,
  name         text not null check (char_length(btrim(name)) between 1 and 60),
  type         text not null check (type in ('income', 'expense')),
  parent_id    uuid references public.categories (id) on delete cascade,
  icon         text check (icon is null or char_length(icon) <= 40),
  color        text check (color is null or color ~ '^#[0-9a-fA-F]{6}$'),
  is_system    boolean not null default false,
  slug         text,
  sort_order   integer not null default 0,
  is_archived  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint categories_owner_consistency check (
    (is_system = true and user_id is null and slug is not null)
    or (is_system = false and user_id is not null)
  )
);

create unique index if not exists categories_system_slug_unique
  on public.categories (slug) where is_system;
create unique index if not exists categories_user_name_unique
  on public.categories (user_id, type, coalesce(parent_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(btrim(name)))
  where user_id is not null;
create index if not exists categories_user_id_idx on public.categories (user_id);
create index if not exists categories_parent_id_idx on public.categories (parent_id);

create trigger categories_set_updated_at
  before update on public.categories
  for each row execute function public.set_updated_at();

-- A category may only nest one level deep, under a parent of the same type that
-- is either global or owned by the same user.
create or replace function public.enforce_category_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  parent record;
begin
  if new.parent_id is null then
    return new;
  end if;
  if new.parent_id = new.id then
    raise exception 'A category cannot be its own parent';
  end if;
  select id, user_id, type, parent_id into parent from public.categories where id = new.parent_id;
  if parent is null then
    raise exception 'Parent category not found';
  end if;
  if parent.parent_id is not null then
    raise exception 'Categories can only be nested one level deep';
  end if;
  if parent.type <> new.type then
    raise exception 'Parent category must have the same type';
  end if;
  if parent.user_id is not null and parent.user_id is distinct from new.user_id then
    raise exception 'Parent category belongs to another user';
  end if;
  return new;
end;
$$;

create trigger categories_enforce_parent
  before insert or update of parent_id, type on public.categories
  for each row execute function public.enforce_category_parent();

-- -----------------------------------------------------------------------------
-- savings_goals (declared before transactions because transactions reference it)
-- -----------------------------------------------------------------------------
create table if not exists public.savings_goals (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  name           text not null check (char_length(btrim(name)) between 1 and 80),
  target_amount  numeric(14,2) not null check (target_amount > 0),
  target_date    date,
  description    text check (description is null or char_length(description) <= 500),
  status         text not null default 'active' check (status in ('active', 'completed', 'archived')),
  account_id     uuid references public.accounts (id) on delete set null,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists savings_goals_user_id_idx on public.savings_goals (user_id, status);

create trigger savings_goals_set_updated_at
  before update on public.savings_goals
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- recurring_transactions (declared before transactions)
-- -----------------------------------------------------------------------------
create table if not exists public.recurring_transactions (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  account_id         uuid not null references public.accounts (id) on delete cascade,
  to_account_id      uuid references public.accounts (id) on delete cascade,
  category_id        uuid references public.categories (id) on delete set null,
  transaction_type   text not null check (transaction_type in ('income', 'expense', 'transfer')),
  amount             numeric(14,2) not null check (amount > 0),
  currency           char(3) not null default 'INR',
  frequency          text not null check (frequency in ('daily', 'weekly', 'monthly', 'yearly')),
  start_date         date not null,
  next_due_date      date not null,
  end_date           date check (end_date is null or end_date >= start_date),
  anchor_day         smallint not null check (anchor_day between 1 and 31),
  merchant           text check (merchant is null or char_length(merchant) <= 120),
  note               text check (note is null or char_length(note) <= 500),
  payment_method     text check (payment_method is null or payment_method in ('cash', 'upi', 'debit_card', 'credit_card', 'bank_transfer', 'wallet', 'other')),
  posting_mode       text not null default 'auto_post' check (posting_mode in ('auto_post', 'reminder')),
  status             text not null default 'active' check (status in ('active', 'paused', 'cancelled', 'completed')),
  is_active          boolean generated always as (status = 'active') stored,
  last_generated_at  timestamptz,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  constraint recurring_transfer_shape check (
    (transaction_type = 'transfer' and to_account_id is not null and to_account_id <> account_id and category_id is null)
    or (transaction_type <> 'transfer' and to_account_id is null and category_id is not null)
  )
);

create index if not exists recurring_user_status_due_idx
  on public.recurring_transactions (user_id, status, next_due_date);
create index if not exists recurring_due_idx
  on public.recurring_transactions (next_due_date) where status = 'active';

create trigger recurring_set_updated_at
  before update on public.recurring_transactions
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- transactions
-- -----------------------------------------------------------------------------
create table if not exists public.transactions (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  account_id                uuid not null references public.accounts (id) on delete restrict,
  to_account_id             uuid references public.accounts (id) on delete restrict,
  category_id               uuid references public.categories (id) on delete restrict,
  transaction_type          text not null check (transaction_type in ('income', 'expense', 'transfer')),
  is_refund                 boolean not null default false,
  amount                    numeric(14,2) not null check (amount > 0 and amount < 1000000000000),
  currency                  char(3) not null default 'INR',
  transaction_date          date not null,
  merchant                  text check (merchant is null or char_length(merchant) <= 120),
  payment_method            text check (payment_method is null or payment_method in ('cash', 'upi', 'debit_card', 'credit_card', 'bank_transfer', 'wallet', 'other')),
  note                      text check (note is null or char_length(note) <= 1000),
  receipt_path              text check (receipt_path is null or char_length(receipt_path) <= 300),
  recurring_transaction_id  uuid references public.recurring_transactions (id) on delete set null,
  savings_goal_id           uuid references public.savings_goals (id) on delete set null,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  constraint transactions_transfer_shape check (
    (transaction_type = 'transfer' and to_account_id is not null and to_account_id <> account_id and category_id is null and is_refund = false)
    or (transaction_type <> 'transfer' and to_account_id is null and category_id is not null)
  ),
  constraint transactions_refund_only_on_expense check (is_refund = false or transaction_type = 'expense'),
  constraint transactions_receipt_path_owner check (receipt_path is null or receipt_path like (user_id::text || '/%'))
);

create index if not exists transactions_user_date_idx on public.transactions (user_id, transaction_date desc, created_at desc);
create index if not exists transactions_user_type_date_idx on public.transactions (user_id, transaction_type, transaction_date);
create index if not exists transactions_user_category_idx on public.transactions (user_id, category_id, transaction_date);
create index if not exists transactions_user_account_idx on public.transactions (user_id, account_id);
create index if not exists transactions_to_account_idx on public.transactions (to_account_id) where to_account_id is not null;
create index if not exists transactions_recurring_idx on public.transactions (recurring_transaction_id) where recurring_transaction_id is not null;
create index if not exists transactions_savings_goal_idx on public.transactions (savings_goal_id) where savings_goal_id is not null;

create trigger transactions_set_updated_at
  before update on public.transactions
  for each row execute function public.set_updated_at();

-- Category type must match the transaction type. Ownership of related rows is
-- enforced by RLS (0002); this trigger guards data integrity.
create or replace function public.enforce_transaction_consistency()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  cat record;
begin
  if new.category_id is not null then
    select type, is_archived into cat from public.categories where id = new.category_id;
    if cat is null then
      raise exception 'Category not found';
    end if;
    if cat.type <> new.transaction_type then
      raise exception 'Category type (%) does not match transaction type (%)', cat.type, new.transaction_type;
    end if;
  end if;
  return new;
end;
$$;

create trigger transactions_enforce_consistency
  before insert or update on public.transactions
  for each row execute function public.enforce_transaction_consistency();

create trigger recurring_enforce_consistency
  before insert or update on public.recurring_transactions
  for each row execute function public.enforce_transaction_consistency();

-- -----------------------------------------------------------------------------
-- recurring_transaction_occurrences (idempotency ledger)
-- -----------------------------------------------------------------------------
create table if not exists public.recurring_transaction_occurrences (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  recurring_transaction_id  uuid not null references public.recurring_transactions (id) on delete cascade,
  scheduled_date            date not null,
  transaction_id            uuid unique references public.transactions (id) on delete set null,
  status                    text not null check (status in ('posted', 'pending', 'skipped', 'failed')),
  created_at                timestamptz not null default now(),
  constraint occurrences_unique_per_date unique (recurring_transaction_id, scheduled_date)
);

create index if not exists occurrences_user_status_idx
  on public.recurring_transaction_occurrences (user_id, status, scheduled_date desc);

-- Alert thresholds: 0-5 distinct integer percentages between 1 and 200.
create or replace function public.valid_alert_thresholds(p smallint[])
returns boolean
language sql
immutable
set search_path = ''
as $$
  select p is not null
     and cardinality(p) <= 5
     and cardinality(p) = cardinality(array(select distinct unnest(p)))
     and not exists (select 1 from unnest(p) t where t < 1 or t > 200);
$$;

-- -----------------------------------------------------------------------------
-- budgets (non-overlapping monthly periods per category; NULL category = overall)
-- -----------------------------------------------------------------------------
create table if not exists public.budgets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  category_id       uuid references public.categories (id) on delete cascade,
  period_type       text not null default 'monthly' check (period_type in ('monthly')),
  period_start      date not null check (extract(day from period_start) = 1),
  period_end        date check (period_end is null or (period_end > period_start and extract(day from period_end) = 1)),
  amount_limit      numeric(14,2) not null check (amount_limit > 0),
  currency          char(3) not null default 'INR',
  alert_thresholds  smallint[] not null default '{80,100}',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint budgets_thresholds_valid check (public.valid_alert_thresholds(alert_thresholds)),
  -- No two budgets for the same user + category may cover the same month.
  constraint budgets_no_overlap exclude using gist (
    user_id with =,
    coalesce(category_id, '00000000-0000-0000-0000-000000000000'::uuid) with =,
    daterange(period_start, period_end, '[)') with &&
  )
);

create index if not exists budgets_user_idx on public.budgets (user_id, period_start);

create trigger budgets_set_updated_at
  before update on public.budgets
  for each row execute function public.set_updated_at();

-- -----------------------------------------------------------------------------
-- notifications
-- -----------------------------------------------------------------------------
create table if not exists public.notifications (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references auth.users (id) on delete cascade,
  type                  text not null check (type in ('budget_alert', 'recurring_reminder', 'recurring_posted', 'system')),
  title                 text not null check (char_length(title) <= 140),
  message               text not null check (char_length(message) <= 1000),
  related_budget_id     uuid references public.budgets (id) on delete cascade,
  related_category_id   uuid references public.categories (id) on delete set null,
  related_recurring_id  uuid references public.recurring_transactions (id) on delete cascade,
  dedupe_key            text,
  read_at               timestamptz,
  created_at            timestamptz not null default now()
);

create unique index if not exists notifications_dedupe_unique
  on public.notifications (user_id, dedupe_key) where dedupe_key is not null;
create index if not exists notifications_user_unread_idx
  on public.notifications (user_id, created_at desc) where read_at is null;
create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- rate_limits (server-side abuse protection; only reachable through a function)
-- -----------------------------------------------------------------------------
create table if not exists public.rate_limits (
  key           text primary key,
  hits          integer not null default 0,
  window_start  timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- New-user bootstrap: profile + two starter accounts.
-- SECURITY DEFINER is required because it runs from an auth.users trigger
-- before the user has a session. Scope is deliberately minimal.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_name text;
begin
  v_name := coalesce(nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(coalesce(new.email, ''), '@', 1));
  v_name := left(v_name, 80);

  insert into public.profiles (id, display_name)
  values (new.id, v_name)
  on conflict (id) do nothing;

  insert into public.accounts (user_id, name, account_type, opening_balance)
  values
    (new.id, 'Cash', 'cash', 0),
    (new.id, 'Bank Account', 'bank', 0)
  on conflict do nothing;

  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
