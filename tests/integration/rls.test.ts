import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { adminPool, asServiceRole, asUser, createTestUser, deleteTestUser, expectRejected, type TestUser } from "./db";

/**
 * Row Level Security isolation: User A must never read, change or delete User
 * B's records even when A knows the exact UUIDs.
 */
let pool: pg.Pool;
let alice: TestUser;
let bob: TestUser;
let aliceCash = "";
let aliceBank = "";
let bobCash = "";
let restaurants = "";
let salary = "";
let foodParent = "";

beforeAll(async () => {
  pool = adminPool();
  await pool.query("select 1");
  alice = await createTestUser(pool, "alice");
  bob = await createTestUser(pool, "bob");
  const acc = await pool.query(`select id, user_id, name from public.accounts where user_id = any($1::uuid[])`, [[alice.id, bob.id]]);
  aliceCash = acc.rows.find((r) => r.user_id === alice.id && r.name === "Cash").id;
  aliceBank = acc.rows.find((r) => r.user_id === alice.id && r.name === "Bank Account").id;
  bobCash = acc.rows.find((r) => r.user_id === bob.id && r.name === "Cash").id;
  const cats = await pool.query(`select id, slug from public.categories where slug in ('food-eating/restaurants','salary','food-eating')`);
  restaurants = cats.rows.find((r) => r.slug === "food-eating/restaurants").id;
  salary = cats.rows.find((r) => r.slug === "salary").id;
  foodParent = cats.rows.find((r) => r.slug === "food-eating").id;
});

afterAll(async () => {
  if (alice) await deleteTestUser(pool, alice.id);
  if (bob) await deleteTestUser(pool, bob.id);
  await pool.end();
});

describe("bootstrap", () => {
  it("creates a profile and starter accounts for new users", async () => {
    const r = await asUser(pool, alice, (c) => c.query(`select display_name from public.profiles`));
    expect(r.rows).toEqual([{ display_name: "alice" }]);
    const a = await asUser(pool, alice, (c) => c.query(`select name from public.accounts order by name`));
    expect(a.rows.map((x) => x.name)).toEqual(["Bank Account", "Cash"]);
  });

  it("anonymous sessions see nothing", async () => {
    const msg = await expectRejected(asUser(pool, null, (c) => c.query(`select * from public.transactions`)));
    expect(msg).toMatch(/permission denied/i);
  });
});

describe("transactions", () => {
  let aliceTx = "";

  it("INSERT: a user can create a transaction on their own account", async () => {
    const r = await asUser(pool, alice, (c) =>
      c.query(
        `insert into public.transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date, merchant)
         values ($1, $2, $3, 'expense', 650.50, current_date, 'Test cafe') returning id`,
        [alice.id, aliceCash, restaurants]
      )
    );
    aliceTx = r.rows[0].id;
    expect(aliceTx).toBeTruthy();
  });

  it("INSERT: cannot spoof another user's id", async () => {
    const msg = await expectRejected(
      asUser(pool, bob, (c) =>
        c.query(
          `insert into public.transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date)
           values ($1, $2, $3, 'expense', 10, current_date)`,
          [alice.id, aliceCash, restaurants]
        )
      )
    );
    expect(msg).toMatch(/row-level security/i);
  });

  it("INSERT: cannot attach a transaction to another user's account (known UUID)", async () => {
    const msg = await expectRejected(
      asUser(pool, bob, (c) =>
        c.query(
          `insert into public.transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date)
           values ($1, $2, $3, 'expense', 10, current_date)`,
          [bob.id, aliceCash, restaurants]
        )
      )
    );
    expect(msg).toMatch(/row-level security/i);
  });

  it("INSERT: cannot use another user's private category", async () => {
    const cat = await asUser(pool, alice, (c) =>
      c.query(`insert into public.categories (user_id, name, type) values ($1, 'Alice private', 'expense') returning id`, [alice.id])
    );
    const msg = await expectRejected(
      asUser(pool, bob, (c) =>
        c.query(
          `insert into public.transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date)
           values ($1, $2, $3, 'expense', 10, current_date)`,
          [bob.id, bobCash, cat.rows[0].id]
        )
      )
    );
    expect(msg).toMatch(/row-level security|category not found/i);
  });

  it("SELECT: Bob cannot see Alice's transaction even by id", async () => {
    const r = await asUser(pool, bob, (c) => c.query(`select * from public.transactions where id = $1`, [aliceTx]));
    expect(r.rowCount).toBe(0);
    const all = await asUser(pool, bob, (c) => c.query(`select count(*)::int as n from public.transactions`));
    expect(all.rows[0].n).toBe(0);
  });

  it("UPDATE: Bob's update of Alice's transaction affects 0 rows", async () => {
    const r = await asUser(pool, bob, (c) => c.query(`update public.transactions set amount = 1 where id = $1`, [aliceTx]));
    expect(r.rowCount).toBe(0);
    const check = await pool.query(`select amount from public.transactions where id = $1`, [aliceTx]);
    expect(Number(check.rows[0].amount)).toBe(650.5);
  });

  it("UPDATE: Alice cannot move her transaction onto Bob's account", async () => {
    const msg = await expectRejected(asUser(pool, alice, (c) => c.query(`update public.transactions set account_id = $2 where id = $1`, [aliceTx, bobCash])));
    expect(msg).toMatch(/row-level security/i);
  });

  it("DELETE: Bob's delete of Alice's transaction affects 0 rows", async () => {
    const r = await asUser(pool, bob, (c) => c.query(`delete from public.transactions where id = $1`, [aliceTx]));
    expect(r.rowCount).toBe(0);
    const check = await pool.query(`select count(*)::int as n from public.transactions where id = $1`, [aliceTx]);
    expect(check.rows[0].n).toBe(1);
  });

  it("integrity: category type must match transaction type; refunds only on expenses", async () => {
    const m1 = await expectRejected(
      asUser(pool, alice, (c) =>
        c.query(`insert into public.transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date) values ($1,$2,$3,'expense',10,current_date)`, [alice.id, aliceCash, salary])
      )
    );
    expect(m1).toMatch(/does not match/i);
    const m2 = await expectRejected(
      asUser(pool, alice, (c) =>
        c.query(`insert into public.transactions (user_id, account_id, category_id, transaction_type, is_refund, amount, transaction_date) values ($1,$2,$3,'income',true,10,current_date)`, [alice.id, aliceCash, salary])
      )
    );
    expect(m2).toMatch(/refund|check constraint/i);
  });

  it("aggregates are scoped to the caller", async () => {
    const a = await asUser(pool, alice, (c) => c.query(`select * from public.period_summary(current_date - 1, current_date)`));
    expect(Number(a.rows[0].net_expense)).toBe(650.5);
    const b = await asUser(pool, bob, (c) => c.query(`select * from public.period_summary(current_date - 1, current_date)`));
    expect(Number(b.rows[0].net_expense)).toBe(0);
  });
});

describe("accounts, categories, budgets, goals, notifications", () => {
  it("accounts are invisible across users and cannot be modified", async () => {
    const r = await asUser(pool, bob, (c) => c.query(`select * from public.accounts where id = $1`, [aliceCash]));
    expect(r.rowCount).toBe(0);
    const u = await asUser(pool, bob, (c) => c.query(`update public.accounts set name = 'pwned' where id = $1`, [aliceCash]));
    expect(u.rowCount).toBe(0);
    const d = await asUser(pool, bob, (c) => c.query(`delete from public.accounts where id = $1`, [aliceCash]));
    expect(d.rowCount).toBe(0);
  });

  it("global categories are readable but immutable for users", async () => {
    const r = await asUser(pool, bob, (c) => c.query(`select count(*)::int as n from public.categories where is_system`));
    expect(r.rows[0].n).toBeGreaterThan(100);
    const u = await asUser(pool, bob, (c) => c.query(`update public.categories set name = 'pwned' where id = $1`, [foodParent]));
    expect(u.rowCount).toBe(0);
    const d = await asUser(pool, bob, (c) => c.query(`delete from public.categories where id = $1`, [foodParent]));
    expect(d.rowCount).toBe(0);
    const msg = await expectRejected(
      asUser(pool, bob, (c) => c.query(`insert into public.categories (user_id, name, type, is_system, slug) values (null, 'Fake global', 'expense', true, 'fake')`))
    );
    expect(msg).toMatch(/row-level security/i);
  });

  it("private categories are invisible to other users; parent must be usable", async () => {
    const cat = await asUser(pool, alice, (c) =>
      c.query(`insert into public.categories (user_id, name, type, parent_id) values ($1, 'Chai', 'expense', $2) returning id`, [alice.id, foodParent])
    );
    const r = await asUser(pool, bob, (c) => c.query(`select * from public.categories where id = $1`, [cat.rows[0].id]));
    expect(r.rowCount).toBe(0);
    const msg = await expectRejected(
      asUser(pool, bob, (c) => c.query(`insert into public.categories (user_id, name, type, parent_id) values ($1, 'Under Alice', 'expense', $2)`, [bob.id, cat.rows[0].id]))
    );
    expect(msg).toMatch(/row-level security|parent category not found/i);
  });

  it("budgets: isolated and non-overlapping", async () => {
    const b = await asUser(pool, alice, (c) =>
      c.query(`insert into public.budgets (user_id, category_id, period_start, amount_limit) values ($1, $2, date_trunc('month', current_date)::date, 1000) returning id`, [alice.id, foodParent])
    );
    const r = await asUser(pool, bob, (c) => c.query(`select * from public.budgets where id = $1`, [b.rows[0].id]));
    expect(r.rowCount).toBe(0);
    const dup = await expectRejected(
      asUser(pool, alice, (c) =>
        c.query(`insert into public.budgets (user_id, category_id, period_start, amount_limit) values ($1, $2, date_trunc('month', current_date)::date, 2000)`, [alice.id, foodParent])
      )
    );
    expect(dup).toMatch(/budgets_no_overlap|conflicting key/i);
    const spoof = await expectRejected(
      asUser(pool, bob, (c) =>
        c.query(`insert into public.budgets (user_id, category_id, period_start, amount_limit) values ($1, $2, date_trunc('month', current_date)::date, 1)`, [alice.id, foodParent])
      )
    );
    expect(spoof).toMatch(/row-level security/i);
  });

  it("savings goals: cannot link another user's account; progress scoped", async () => {
    const msg = await expectRejected(
      asUser(pool, bob, (c) => c.query(`insert into public.savings_goals (user_id, name, target_amount, account_id) values ($1, 'Trip', 50000, $2)`, [bob.id, aliceBank]))
    );
    expect(msg).toMatch(/row-level security/i);
    const g = await asUser(pool, alice, (c) =>
      c.query(`insert into public.savings_goals (user_id, name, target_amount, account_id) values ($1, 'Emergency', 100000, $2) returning id`, [alice.id, aliceBank])
    );
    await asUser(pool, alice, (c) =>
      c.query(`insert into public.transactions (user_id, account_id, to_account_id, transaction_type, amount, transaction_date, savings_goal_id) values ($1,$2,$3,'transfer',2500,current_date,$4)`, [alice.id, aliceCash, aliceBank, g.rows[0].id])
    );
    const p = await asUser(pool, alice, (c) => c.query(`select saved from public.savings_goal_progress() where goal_id = $1`, [g.rows[0].id]));
    expect(Number(p.rows[0].saved)).toBe(2500);
    const bp = await asUser(pool, bob, (c) => c.query(`select * from public.savings_goal_progress()`));
    expect(bp.rowCount).toBe(0);
    // Tagging a goal you do not own is rejected
    const tag = await expectRejected(
      asUser(pool, bob, (c) =>
        c.query(`insert into public.transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date, savings_goal_id) values ($1,$2,$3,'income',10,current_date,$4)`, [bob.id, bobCash, salary, g.rows[0].id])
      )
    );
    expect(tag).toMatch(/row-level security/i);
  });

  it("notifications are private", async () => {
    const n = await asUser(pool, alice, (c) =>
      c.query(`insert into public.notifications (user_id, type, title, message) values ($1, 'system', 'Hi', 'Hello') returning id`, [alice.id])
    );
    const r = await asUser(pool, bob, (c) => c.query(`select * from public.notifications where id = $1`, [n.rows[0].id]));
    expect(r.rowCount).toBe(0);
    const u = await asUser(pool, bob, (c) => c.query(`update public.notifications set read_at = now() where id = $1`, [n.rows[0].id]));
    expect(u.rowCount).toBe(0);
  });
});

describe("receipt storage isolation", () => {
  it("users can only create objects inside their own folder", async () => {
    const own = await asUser(pool, alice, (c) =>
      c.query(`insert into storage.objects (bucket_id, name, owner) values ('receipts', $1, $2) returning id`, [`${alice.id}/tx1/a.jpg`, alice.id])
    );
    expect(own.rowCount).toBe(1);
    const msg = await expectRejected(
      asUser(pool, bob, (c) => c.query(`insert into storage.objects (bucket_id, name, owner) values ('receipts', $1, $2)`, [`${alice.id}/tx1/b.jpg`, bob.id]))
    );
    expect(msg).toMatch(/row-level security/i);
    const seen = await asUser(pool, bob, (c) => c.query(`select name from storage.objects where bucket_id = 'receipts' and name like $1`, [`${alice.id}/%`]));
    expect(seen.rowCount).toBe(0);
    const del = await asUser(pool, bob, (c) => c.query(`delete from storage.objects where bucket_id = 'receipts' and name like $1`, [`${alice.id}/%`]));
    expect(del.rowCount).toBe(0);
    await pool.query(`delete from storage.objects where bucket_id = 'receipts' and name like $1`, [`${alice.id}/%`]);
  });

  it("receipt_path on a transaction must live under the owner's folder", async () => {
    const msg = await expectRejected(
      asUser(pool, alice, (c) =>
        c.query(`insert into public.transactions (user_id, account_id, category_id, transaction_type, amount, transaction_date, receipt_path) values ($1,$2,$3,'expense',10,current_date,$4)`, [alice.id, aliceCash, restaurants, `${bob.id}/x/y.jpg`])
      )
    );
    expect(msg).toMatch(/receipt_path_owner|check constraint/i);
  });
});

describe("service role", () => {
  it("can run the global recurring processor; users cannot", async () => {
    const msg = await expectRejected(asUser(pool, alice, (c) => c.query(`select * from public.process_all_recurring_transactions()`)));
    expect(msg).toMatch(/permission denied/i);
    const r = await asServiceRole(pool, (c) => c.query(`select * from public.process_all_recurring_transactions()`));
    expect(Array.isArray(r.rows)).toBe(true);
  });
});
