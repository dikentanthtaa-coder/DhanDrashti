import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { adminPool, asUser, createTestUser, deleteTestUser, type TestUser } from "./db";

let pool: pg.Pool;
let user: TestUser;
let bank = "";
let rent = "";
let food = "";
let restaurants = "";

beforeAll(async () => {
  pool = adminPool();
  user = await createTestUser(pool, "carol");
  const acc = await pool.query(`select id from public.accounts where user_id = $1 and name = 'Bank Account'`, [user.id]);
  bank = acc.rows[0].id;
  const cats = await pool.query(`select id, slug from public.categories where slug in ('home-rent/rent','food-eating','food-eating/restaurants')`);
  rent = cats.rows.find((r) => r.slug === "home-rent/rent").id;
  food = cats.rows.find((r) => r.slug === "food-eating").id;
  restaurants = cats.rows.find((r) => r.slug === "food-eating/restaurants").id;
});

afterAll(async () => {
  if (user) await deleteTestUser(pool, user.id);
  await pool.end();
});

describe("recurring transactions", () => {
  it("month-end dates clamp and recover the anchor day", async () => {
    const r = await pool.query(
      `select to_char(public.recurring_next_date('monthly', '2026-01-31', 31), 'YYYY-MM-DD') as a,
              to_char(public.recurring_next_date('monthly', '2026-02-28', 31), 'YYYY-MM-DD') as b,
              to_char(public.recurring_next_date('yearly', '2024-02-29', 29), 'YYYY-MM-DD') as c,
              to_char(public.recurring_next_date('weekly', '2026-12-28', 28), 'YYYY-MM-DD') as d`
    );
    expect(r.rows[0]).toEqual({ a: "2026-02-28", b: "2026-03-31", c: "2025-02-28", d: "2027-01-04" });
  });

  it("catch-up processing is idempotent and never posts duplicates", async () => {
    const sched = await asUser(pool, user, (c) =>
      c.query(
        `insert into public.recurring_transactions (user_id, account_id, category_id, transaction_type, amount, frequency, start_date, next_due_date, anchor_day, merchant)
         values ($1, $2, $3, 'expense', 15000, 'monthly', '2026-01-31', '2026-01-31', 31, 'Landlord') returning id`,
        [user.id, bank, rent]
      )
    );
    const first = await asUser(pool, user, (c) => c.query(`select * from public.process_my_recurring_transactions('2026-04-15')`));
    expect(first.rows[0].posted).toBe(3); // Jan 31, Feb 28, Mar 31
    const second = await asUser(pool, user, (c) => c.query(`select * from public.process_my_recurring_transactions('2026-04-15')`));
    expect(second.rows[0].posted).toBe(0);
    const occ = await asUser(pool, user, (c) =>
      c.query(`select to_char(scheduled_date,'YYYY-MM-DD') as d, status from public.recurring_transaction_occurrences where recurring_transaction_id = $1 order by scheduled_date`, [sched.rows[0].id])
    );
    expect(occ.rows.map((r) => r.d)).toEqual(["2026-01-31", "2026-02-28", "2026-03-31"]);
    const txs = await asUser(pool, user, (c) => c.query(`select count(*)::int as n from public.transactions where recurring_transaction_id = $1`, [sched.rows[0].id]));
    expect(txs.rows[0].n).toBe(3);
    const next = await asUser(pool, user, (c) => c.query(`select to_char(next_due_date,'YYYY-MM-DD') as d, status from public.recurring_transactions where id = $1`, [sched.rows[0].id]));
    expect(next.rows[0]).toEqual({ d: "2026-04-30", status: "active" });

    // Re-inserting an occurrence for an already generated date is rejected (unique ledger)
    let dup = "";
    try {
      await asUser(pool, user, (c) =>
        c.query(`insert into public.recurring_transaction_occurrences (user_id, recurring_transaction_id, scheduled_date, status) values ($1, $2, '2026-02-28', 'posted')`, [user.id, sched.rows[0].id])
      );
    } catch (e) {
      dup = (e as Error).message;
    }
    expect(dup).toMatch(/occurrences_unique_per_date|duplicate key/i);
  });

  it("completes a schedule when the end date passes and supports reminder mode", async () => {
    const sched = await asUser(pool, user, (c) =>
      c.query(
        `insert into public.recurring_transactions (user_id, account_id, category_id, transaction_type, amount, frequency, start_date, next_due_date, end_date, anchor_day, posting_mode, merchant)
         values ($1, $2, $3, 'expense', 500, 'weekly', '2026-03-01', '2026-03-01', '2026-03-10', 1, 'reminder', 'Gym') returning id`,
        [user.id, bank, restaurants]
      )
    );
    const r = await asUser(pool, user, (c) => c.query(`select * from public.process_my_recurring_transactions('2026-04-01')`));
    expect(r.rows[0].reminders).toBe(2); // Mar 1, Mar 8
    expect(r.rows[0].completed).toBe(1);
    const pending = await asUser(pool, user, (c) =>
      c.query(`select id from public.recurring_transaction_occurrences where recurring_transaction_id = $1 and status = 'pending' order by scheduled_date`, [sched.rows[0].id])
    );
    expect(pending.rowCount).toBe(2);
    const notif = await asUser(pool, user, (c) => c.query(`select count(*)::int as n from public.notifications where type = 'recurring_reminder' and related_recurring_id = $1`, [sched.rows[0].id]));
    expect(notif.rows[0].n).toBe(2);

    // Confirming posts exactly one transaction; confirming twice fails.
    const tx = await asUser(pool, user, (c) => c.query(`select public.confirm_recurring_occurrence($1) as id`, [pending.rows[0].id]));
    expect(tx.rows[0].id).toBeTruthy();
    let msg = "";
    try {
      await asUser(pool, user, (c) => c.query(`select public.confirm_recurring_occurrence($1)`, [pending.rows[0].id]));
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/not pending/i);
  });
});

describe("budget alerts", () => {
  it("fires each threshold once per budget and month, even on repeated calls", async () => {
    await asUser(pool, user, (c) =>
      c.query(`insert into public.budgets (user_id, category_id, period_start, amount_limit, alert_thresholds) values ($1, $2, '2026-06-01', 1000, '{80,100}')`, [user.id, food])
    );
    await asUser(pool, user, (c) =>
      c.query(`insert into public.transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date) values ($1,$2,$3,'expense',850,'2026-06-10')`, [user.id, bank, restaurants])
    );
    const first = await asUser(pool, user, (c) => c.query(`select title from public.check_budget_alerts('2026-06-10')`));
    expect(first.rows.map((r) => r.title)).toEqual(["Food & Eating budget at 80%"]);
    const again = await asUser(pool, user, (c) => c.query(`select title from public.check_budget_alerts('2026-06-10')`));
    expect(again.rowCount).toBe(0);

    // Concurrent-style double call: run both in parallel; total new alerts must be exactly 1
    await asUser(pool, user, (c) =>
      c.query(`insert into public.transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date) values ($1,$2,$3,'expense',200,'2026-06-11')`, [user.id, bank, restaurants])
    );
    const [a, b] = await Promise.all([
      asUser(pool, user, (c) => c.query(`select title from public.check_budget_alerts('2026-06-11')`)),
      asUser(pool, user, (c) => c.query(`select title from public.check_budget_alerts('2026-06-11')`)),
    ]);
    expect((a.rowCount ?? 0) + (b.rowCount ?? 0)).toBe(1);
    const total = await asUser(pool, user, (c) => c.query(`select count(*)::int as n from public.notifications where type = 'budget_alert'`));
    expect(total.rows[0].n).toBe(2);

    // A refund that brings spending back under 100% does not remove the alert, and next month starts fresh.
    const usage = await asUser(pool, user, (c) => c.query(`select percent_used from public.budget_usage('2026-06-01')`));
    expect(Number(usage.rows[0].percent_used)).toBe(105);
    const july = await asUser(pool, user, (c) => c.query(`select * from public.check_budget_alerts('2026-07-01')`));
    expect(july.rowCount).toBe(0);
  });

  it("parent-category budgets include subcategory spending and refunds reduce it", async () => {
    await asUser(pool, user, (c) =>
      c.query(`insert into public.transactions (user_id, account_id, category_id, transaction_type, is_refund, amount, transaction_date) values ($1,$2,$3,'expense',true,50,'2026-06-12')`, [user.id, bank, restaurants])
    );
    const usage = await asUser(pool, user, (c) => c.query(`select spent, remaining from public.budget_usage('2026-06-15')`));
    expect(Number(usage.rows[0].spent)).toBe(1000);
    expect(Number(usage.rows[0].remaining)).toBe(0);
  });
});

describe("rate limiting", () => {
  it("allows up to the limit within the window", async () => {
    const results: boolean[] = [];
    for (let i = 0; i < 4; i++) {
      const r = await asUser(pool, user, (c) => c.query(`select public.rate_limit_hit('test-key', 3, 60) as ok`));
      results.push(r.rows[0].ok);
    }
    expect(results).toEqual([true, true, true, false]);
    // Users cannot read or tamper with the table directly
    let msg = "";
    try {
      await asUser(pool, user, (c) => c.query(`select * from public.rate_limits`));
    } catch (e) {
      msg = (e as Error).message;
    }
    expect(msg).toMatch(/permission denied/i);
  });
});
