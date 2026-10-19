-- =============================================================================
-- DhanDrashti · 0003 · Database functions
--   * Aggregations used by dashboard/reports (SECURITY INVOKER: RLS applies)
--   * Budget threshold alerts with duplicate prevention
--   * Recurring transaction processing (idempotent via occurrence ledger)
--   * Rate limiting (the only SECURITY DEFINER besides new-user bootstrap and
--     the service-role-only recurring processor)
--
-- Accounting policy (documented in README):
--   income        -> counts as income
--   expense       -> counts as spending (is_refund=false)
--   expense+refund-> reduces spending in the same category (is_refund=true)
--   transfer      -> moves money between the user's own accounts; never income
--                    or expense. Transfers tagged with a savings goal are
--                    contributions to that goal.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Period summary (inclusive date range)
-- -----------------------------------------------------------------------------
create or replace function public.period_summary(p_start date, p_end date)
returns table (
  total_income      numeric,
  gross_expense     numeric,
  total_refund      numeric,
  net_expense       numeric,
  total_transfers   numeric,
  transaction_count bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(sum(t.amount) filter (where t.transaction_type = 'income'), 0)::numeric,
    coalesce(sum(t.amount) filter (where t.transaction_type = 'expense' and not t.is_refund), 0)::numeric,
    coalesce(sum(t.amount) filter (where t.transaction_type = 'expense' and t.is_refund), 0)::numeric,
    (coalesce(sum(t.amount) filter (where t.transaction_type = 'expense' and not t.is_refund), 0)
      - coalesce(sum(t.amount) filter (where t.transaction_type = 'expense' and t.is_refund), 0))::numeric,
    coalesce(sum(t.amount) filter (where t.transaction_type = 'transfer'), 0)::numeric,
    count(*)
  from public.transactions t
  where t.user_id = (select auth.uid())
    and t.transaction_date between p_start and p_end;
$$;

-- -----------------------------------------------------------------------------
-- Category totals (net of refunds). Returns one row per category that has data.
-- -----------------------------------------------------------------------------
create or replace function public.category_totals(p_start date, p_end date, p_type text default 'expense')
returns table (
  category_id   uuid,
  category_name text,
  parent_id     uuid,
  parent_name   text,
  icon          text,
  color         text,
  total         numeric,
  tx_count      bigint
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    c.id,
    c.name,
    c.parent_id,
    p.name,
    coalesce(c.icon, p.icon),
    coalesce(c.color, p.color),
    coalesce(sum(case when t.is_refund then -t.amount else t.amount end), 0)::numeric,
    count(t.id)
  from public.transactions t
  join public.categories c on c.id = t.category_id
  left join public.categories p on p.id = c.parent_id
  where t.user_id = (select auth.uid())
    and t.transaction_type = p_type
    and t.transaction_date between p_start and p_end
  group by c.id, c.name, c.parent_id, p.name, c.icon, p.icon, c.color, p.color
  order by 7 desc;
$$;

-- -----------------------------------------------------------------------------
-- Daily totals (only days with activity; the app fills gaps)
-- -----------------------------------------------------------------------------
create or replace function public.daily_totals(p_start date, p_end date)
returns table (day date, income numeric, expense numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    t.transaction_date,
    coalesce(sum(t.amount) filter (where t.transaction_type = 'income'), 0)::numeric,
    coalesce(sum(case when t.transaction_type = 'expense' then (case when t.is_refund then -t.amount else t.amount end) end), 0)::numeric
  from public.transactions t
  where t.user_id = (select auth.uid())
    and t.transaction_date between p_start and p_end
  group by t.transaction_date
  order by t.transaction_date;
$$;

-- -----------------------------------------------------------------------------
-- Monthly totals
-- -----------------------------------------------------------------------------
create or replace function public.monthly_totals(p_start date, p_end date)
returns table (month date, income numeric, expense numeric, refunds numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    date_trunc('month', t.transaction_date)::date,
    coalesce(sum(t.amount) filter (where t.transaction_type = 'income'), 0)::numeric,
    coalesce(sum(case when t.transaction_type = 'expense' then (case when t.is_refund then -t.amount else t.amount end) end), 0)::numeric,
    coalesce(sum(t.amount) filter (where t.transaction_type = 'expense' and t.is_refund), 0)::numeric
  from public.transactions t
  where t.user_id = (select auth.uid())
    and t.transaction_date between p_start and p_end
  group by 1
  order by 1;
$$;

-- -----------------------------------------------------------------------------
-- Payment-method totals (net spending)
-- -----------------------------------------------------------------------------
create or replace function public.payment_method_totals(p_start date, p_end date)
returns table (payment_method text, total numeric, tx_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    coalesce(t.payment_method, 'other'),
    coalesce(sum(case when t.is_refund then -t.amount else t.amount end), 0)::numeric,
    count(*)
  from public.transactions t
  where t.user_id = (select auth.uid())
    and t.transaction_type = 'expense'
    and t.transaction_date between p_start and p_end
  group by 1
  order by 2 desc;
$$;

-- -----------------------------------------------------------------------------
-- Merchant totals (net spending)
-- -----------------------------------------------------------------------------
create or replace function public.merchant_totals(p_start date, p_end date, p_limit integer default 10)
returns table (merchant text, total numeric, tx_count bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    t.merchant,
    coalesce(sum(case when t.is_refund then -t.amount else t.amount end), 0)::numeric,
    count(*)
  from public.transactions t
  where t.user_id = (select auth.uid())
    and t.transaction_type = 'expense'
    and t.merchant is not null and btrim(t.merchant) <> ''
    and t.transaction_date between p_start and p_end
  group by t.merchant
  order by 2 desc
  limit greatest(1, least(p_limit, 100));
$$;

-- -----------------------------------------------------------------------------
-- Account balances
--   balance = opening + income + refunds + transfers in - expenses - transfers out
--   (credit card accounts therefore show a negative balance = amount owed)
-- -----------------------------------------------------------------------------
create or replace function public.account_balances()
returns table (
  account_id   uuid,
  name         text,
  account_type text,
  is_active    boolean,
  balance      numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    a.id,
    a.name,
    a.account_type,
    a.is_active,
    (a.opening_balance
      + coalesce((
          select sum(
            case
              when t.transaction_type = 'income' then t.amount
              when t.transaction_type = 'expense' and t.is_refund then t.amount
              when t.transaction_type = 'expense' then -t.amount
              when t.transaction_type = 'transfer' then -t.amount
              else 0
            end)
          from public.transactions t
          where t.account_id = a.id and t.user_id = a.user_id), 0)
      + coalesce((
          select sum(t.amount)
          from public.transactions t
          where t.to_account_id = a.id and t.user_id = a.user_id and t.transaction_type = 'transfer'), 0)
    )::numeric
  from public.accounts a
  where a.user_id = (select auth.uid())
  order by a.created_at;
$$;

-- -----------------------------------------------------------------------------
-- Budget usage for a given month (explicit user variant + auth.uid() wrapper)
-- Spending for a parent category includes its subcategories.
-- -----------------------------------------------------------------------------
create or replace function public.budget_usage_for_user(p_user_id uuid, p_month date)
returns table (
  budget_id        uuid,
  category_id      uuid,
  category_name    text,
  category_icon    text,
  category_color   text,
  amount_limit     numeric,
  spent            numeric,
  remaining        numeric,
  percent_used     numeric,
  alert_thresholds smallint[],
  period_start     date,
  period_end       date
)
language sql
stable
security invoker
set search_path = ''
as $$
  with m as (
    select date_trunc('month', p_month)::date as m_start,
           (date_trunc('month', p_month) + interval '1 month - 1 day')::date as m_end
  ),
  spend as (
    select
      b.id as budget_id,
      coalesce(sum(case when t.is_refund then -t.amount else t.amount end), 0)::numeric as spent
    from public.budgets b
    cross join m
    left join public.transactions t
      on t.user_id = b.user_id
     and t.transaction_type = 'expense'
     and t.transaction_date between m.m_start and m.m_end
     and (
       b.category_id is null
       or t.category_id = b.category_id
       or exists (select 1 from public.categories c where c.id = t.category_id and c.parent_id = b.category_id)
     )
    where b.user_id = p_user_id
      and (auth.uid() is null or auth.uid() = p_user_id)
      and b.period_start <= m.m_start
      and (b.period_end is null or b.period_end > m.m_start)
    group by b.id
  )
  select
    b.id,
    b.category_id,
    c.name,
    c.icon,
    c.color,
    b.amount_limit,
    s.spent,
    (b.amount_limit - s.spent)::numeric,
    case when b.amount_limit > 0 then round(s.spent / b.amount_limit * 100, 2) else 0 end::numeric,
    b.alert_thresholds,
    b.period_start,
    b.period_end
  from spend s
  join public.budgets b on b.id = s.budget_id
  left join public.categories c on c.id = b.category_id
  order by (b.category_id is not null), c.name;
$$;

create or replace function public.budget_usage(p_month date)
returns table (
  budget_id        uuid,
  category_id      uuid,
  category_name    text,
  category_icon    text,
  category_color   text,
  amount_limit     numeric,
  spent            numeric,
  remaining        numeric,
  percent_used     numeric,
  alert_thresholds smallint[],
  period_start     date,
  period_end       date
)
language sql
stable
security invoker
set search_path = ''
as $$
  select * from public.budget_usage_for_user((select auth.uid()), p_month);
$$;

-- Month-by-month history for one budget (most recent first)
create or replace function public.budget_history(p_budget_id uuid, p_months integer default 6)
returns table (month date, amount_limit numeric, spent numeric)
language sql
stable
security invoker
set search_path = ''
as $$
  with b as (
    select * from public.budgets where id = p_budget_id and user_id = (select auth.uid())
  ),
  months as (
    select (date_trunc('month', now()) - (g || ' month')::interval)::date as m_start
    from generate_series(0, greatest(1, least(p_months, 24)) - 1) g
  )
  select
    months.m_start,
    b.amount_limit,
    coalesce((
      select sum(case when t.is_refund then -t.amount else t.amount end)
      from public.transactions t
      where t.user_id = b.user_id
        and t.transaction_type = 'expense'
        and t.transaction_date >= months.m_start
        and t.transaction_date < (months.m_start + interval '1 month')::date
        and (
          b.category_id is null
          or t.category_id = b.category_id
          or exists (select 1 from public.categories c where c.id = t.category_id and c.parent_id = b.category_id)
        )
    ), 0)::numeric
  from months cross join b
  where b.period_start <= months.m_start
    and (b.period_end is null or b.period_end > months.m_start)
  order by months.m_start desc;
$$;

-- -----------------------------------------------------------------------------
-- Savings goal progress: contributions are transfers tagged with the goal.
-- A transfer OUT of the goal's linked account counts as a withdrawal.
-- -----------------------------------------------------------------------------
create or replace function public.savings_goal_progress()
returns table (goal_id uuid, saved numeric, contribution_count bigint, last_contribution date)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    g.id,
    coalesce(sum(
      case
        when t.transaction_type = 'transfer' and g.account_id is not null and t.account_id = g.account_id then -t.amount
        when t.transaction_type = 'transfer' then t.amount
        when t.transaction_type = 'income' then t.amount
        else 0
      end), 0)::numeric,
    count(t.id),
    max(t.transaction_date)
  from public.savings_goals g
  left join public.transactions t on t.savings_goal_id = g.id and t.user_id = g.user_id
  where g.user_id = (select auth.uid())
  group by g.id;
$$;

-- -----------------------------------------------------------------------------
-- Budget alerts. Inserts one notification per (budget, month, threshold) at most,
-- using the partial unique index on (user_id, dedupe_key). Safe under
-- concurrent calls: the second caller's insert is a no-op.
-- -----------------------------------------------------------------------------
create or replace function public.check_budget_alerts_for_user(p_user_id uuid, p_date date)
returns setof public.notifications
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_month date := date_trunc('month', p_date)::date;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  return query
  with usage as (
    select * from public.budget_usage_for_user(p_user_id, v_month)
  ),
  crossed as (
    select u.*, th.threshold
    from usage u
    cross join lateral unnest(u.alert_thresholds) as th(threshold)
    where u.percent_used >= th.threshold
  )
  insert into public.notifications (user_id, type, title, message, related_budget_id, related_category_id, dedupe_key)
  select
    p_user_id,
    'budget_alert',
    case
      when c.threshold >= 100 then coalesce(c.category_name, 'Overall') || ' budget exceeded'
      else coalesce(c.category_name, 'Overall') || ' budget at ' || c.threshold || '%'
    end,
    'You have used ' || to_char(c.percent_used, 'FM999999990.00') || '% of your '
      || coalesce(c.category_name, 'overall') || ' budget for ' || to_char(v_month, 'Month YYYY')
      || ' (spent ' || to_char(c.spent, 'FM999999999990.00') || ' of ' || to_char(c.amount_limit, 'FM999999999990.00') || ').',
    c.budget_id,
    c.category_id,
    'budget:' || c.budget_id || ':' || to_char(v_month, 'YYYY-MM') || ':' || c.threshold
  from crossed c
  on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing
  returning *;
end;
$$;

create or replace function public.check_budget_alerts(p_date date default null)
returns setof public.notifications
language sql
security invoker
set search_path = ''
as $$
  select * from public.check_budget_alerts_for_user(
    (select auth.uid()),
    coalesce(p_date, (now() at time zone coalesce((select timezone from public.profiles where id = (select auth.uid())), 'Asia/Kolkata'))::date)
  );
$$;

-- -----------------------------------------------------------------------------
-- Recurring schedules
-- -----------------------------------------------------------------------------

-- Next due date after p_from. Monthly/yearly clamp to the last day of the month
-- while remembering the original day (anchor_day), so Jan 31 -> Feb 28 -> Mar 31.
create or replace function public.recurring_next_date(p_frequency text, p_from date, p_anchor_day integer)
returns date
language plpgsql
immutable
set search_path = ''
as $$
declare
  v_month_start date;
  v_last_day    integer;
begin
  case p_frequency
    when 'daily' then
      return p_from + 1;
    when 'weekly' then
      return p_from + 7;
    when 'monthly' then
      v_month_start := (date_trunc('month', p_from) + interval '1 month')::date;
    when 'yearly' then
      v_month_start := (date_trunc('month', p_from) + interval '1 year')::date;
    else
      raise exception 'Unsupported frequency %', p_frequency;
  end case;
  v_last_day := extract(day from (v_month_start + interval '1 month' - interval '1 day'))::integer;
  return v_month_start + (least(p_anchor_day, v_last_day) - 1);
end;
$$;

-- Core processor for one user. Idempotent: the occurrence ledger has a unique
-- (schedule, scheduled_date) key, so re-running never posts twice.
create or replace function public.process_recurring_for_user(p_user_id uuid, p_as_of date)
returns table (posted integer, reminders integer, completed integer)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  r            record;
  v_next       date;
  v_occ_id     uuid;
  v_tx_id      uuid;
  v_iterations integer;
  v_posted     integer := 0;
  v_reminders  integer := 0;
  v_completed  integer := 0;
  v_status     text;
begin
  if auth.uid() is not null and auth.uid() <> p_user_id then
    raise exception 'not allowed' using errcode = '42501';
  end if;

  for r in
    select rt.*
    from public.recurring_transactions rt
    where rt.user_id = p_user_id
      and rt.status = 'active'
      and rt.next_due_date <= p_as_of
    order by rt.next_due_date
    for update skip locked
  loop
    v_next := r.next_due_date;
    v_status := r.status;
    v_iterations := 0;

    while v_next <= p_as_of and (r.end_date is null or v_next <= r.end_date) and v_iterations < 400 loop
      v_iterations := v_iterations + 1;
      v_occ_id := null;

      insert into public.recurring_transaction_occurrences (user_id, recurring_transaction_id, scheduled_date, status)
      values (p_user_id, r.id, v_next, case when r.posting_mode = 'auto_post' then 'posted' else 'pending' end)
      on conflict (recurring_transaction_id, scheduled_date) do nothing
      returning id into v_occ_id;

      if v_occ_id is not null then
        if r.posting_mode = 'auto_post' then
          insert into public.transactions (
            user_id, account_id, to_account_id, category_id, transaction_type, amount, currency,
            transaction_date, merchant, payment_method, note, recurring_transaction_id
          ) values (
            p_user_id, r.account_id, r.to_account_id, r.category_id, r.transaction_type, r.amount, r.currency,
            v_next, r.merchant, r.payment_method, r.note, r.id
          ) returning id into v_tx_id;

          update public.recurring_transaction_occurrences set transaction_id = v_tx_id where id = v_occ_id;
          v_posted := v_posted + 1;
        else
          insert into public.notifications (user_id, type, title, message, related_recurring_id, dedupe_key)
          values (
            p_user_id, 'recurring_reminder',
            'Due: ' || coalesce(r.merchant, r.note, initcap(r.transaction_type)),
            'A scheduled ' || r.transaction_type || ' of ' || to_char(r.amount, 'FM999999999990.00')
              || ' was due on ' || to_char(v_next, 'DD Mon YYYY') || '. Confirm or skip it on the Recurring page.',
            r.id,
            'recurring:' || r.id || ':' || to_char(v_next, 'YYYY-MM-DD')
          )
          on conflict (user_id, dedupe_key) where dedupe_key is not null do nothing;
          v_reminders := v_reminders + 1;
        end if;
      end if;

      v_next := public.recurring_next_date(r.frequency, v_next, r.anchor_day);
    end loop;

    if r.end_date is not null and v_next > r.end_date then
      v_status := 'completed';
      v_completed := v_completed + 1;
    end if;

    update public.recurring_transactions
      set next_due_date = v_next,
          last_generated_at = now(),
          status = v_status
      where id = r.id;
  end loop;

  if v_posted > 0 then
    perform public.check_budget_alerts_for_user(p_user_id, p_as_of);
  end if;

  return query select v_posted, v_reminders, v_completed;
end;
$$;

-- User-facing: process my own due schedules ("today" in my timezone).
create or replace function public.process_my_recurring_transactions(p_as_of date default null)
returns table (posted integer, reminders integer, completed integer)
language sql
security invoker
set search_path = ''
as $$
  select * from public.process_recurring_for_user(
    (select auth.uid()),
    coalesce(p_as_of, (now() at time zone coalesce((select timezone from public.profiles where id = (select auth.uid())), 'Asia/Kolkata'))::date)
  );
$$;

-- Scheduler-facing: process every user. SECURITY DEFINER so it can bypass RLS;
-- executable by service_role only (the cron route uses the secret key).
create or replace function public.process_all_recurring_transactions()
returns table (user_id uuid, posted integer, reminders integer, completed integer)
language plpgsql
security definer
set search_path = ''
as $$
declare
  u record;
  res record;
  v_as_of date;
begin
  for u in
    select distinct rt.user_id, coalesce(p.timezone, 'Asia/Kolkata') as tz
    from public.recurring_transactions rt
    left join public.profiles p on p.id = rt.user_id
    where rt.status = 'active' and rt.next_due_date <= (now() at time zone 'UTC')::date + 1
  loop
    v_as_of := (now() at time zone u.tz)::date;
    select * into res from public.process_recurring_for_user(u.user_id, v_as_of);
    user_id := u.user_id; posted := res.posted; reminders := res.reminders; completed := res.completed;
    return next;
  end loop;
  return;
end;
$$;

revoke all on function public.process_all_recurring_transactions() from public, anon, authenticated;
grant execute on function public.process_all_recurring_transactions() to service_role;

-- Confirm a pending (reminder-mode) occurrence: posts the transaction atomically.
create or replace function public.confirm_recurring_occurrence(p_occurrence_id uuid, p_transaction_date date default null)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  o record;
  r record;
  v_tx_id uuid;
begin
  select * into o from public.recurring_transaction_occurrences
    where id = p_occurrence_id and user_id = (select auth.uid())
    for update;
  if o is null then
    raise exception 'Occurrence not found' using errcode = 'P0002';
  end if;
  if o.status <> 'pending' then
    raise exception 'Occurrence is not pending' using errcode = 'P0001';
  end if;
  select * into r from public.recurring_transactions where id = o.recurring_transaction_id;

  insert into public.transactions (
    user_id, account_id, to_account_id, category_id, transaction_type, amount, currency,
    transaction_date, merchant, payment_method, note, recurring_transaction_id
  ) values (
    o.user_id, r.account_id, r.to_account_id, r.category_id, r.transaction_type, r.amount, r.currency,
    coalesce(p_transaction_date, o.scheduled_date), r.merchant, r.payment_method, r.note, r.id
  ) returning id into v_tx_id;

  update public.recurring_transaction_occurrences
    set status = 'posted', transaction_id = v_tx_id
    where id = o.id;

  update public.notifications set read_at = coalesce(read_at, now())
    where user_id = o.user_id and dedupe_key = 'recurring:' || r.id || ':' || to_char(o.scheduled_date, 'YYYY-MM-DD');

  perform public.check_budget_alerts_for_user(o.user_id, coalesce(p_transaction_date, o.scheduled_date));
  return v_tx_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Rate limiting (fixed window). Returns TRUE when the call is allowed.
-- Keys are namespaced by the caller's auth.uid() so users cannot affect each other.
-- -----------------------------------------------------------------------------
create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key   text := coalesce((select auth.uid())::text, 'anon') || ':' || p_key;
  v_hits  integer;
begin
  -- opportunistic cleanup of stale windows
  delete from public.rate_limits where window_start < now() - interval '1 day';

  insert into public.rate_limits as rl (key, hits, window_start)
  values (v_key, 1, now())
  on conflict (key) do update
    set hits = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then 1 else rl.hits + 1 end,
        window_start = case when rl.window_start < now() - make_interval(secs => p_window_seconds) then now() else rl.window_start end
  returning hits into v_hits;

  return v_hits <= p_limit;
end;
$$;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon;
grant execute on function public.rate_limit_hit(text, integer, integer) to authenticated, service_role;
