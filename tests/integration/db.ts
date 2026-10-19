import pg from "pg";
import { randomUUID } from "node:crypto";

export const DATABASE_URL = process.env.DATABASE_URL ?? "postgres://postgres:postgres@localhost:54329/postgres";

export function adminPool() {
  return new pg.Pool({
    connectionString: DATABASE_URL,
    max: 4,
    ssl: DATABASE_URL.includes("supabase.co") ? { rejectUnauthorized: false } : undefined,
  });
}

export interface TestUser {
  id: string;
  email: string;
}

/** Creates an auth user directly (fires the profile/accounts bootstrap trigger). */
export async function createTestUser(pool: pg.Pool, label: string): Promise<TestUser> {
  const id = randomUUID();
  const email = `${label}-${id.slice(0, 8)}@test.invalid`;
  await pool.query(
    `insert into auth.users (id, instance_id, email, encrypted_password, aud, role, raw_user_meta_data, created_at, updated_at)
     values ($1, '00000000-0000-0000-0000-000000000000', $2, 'x', 'authenticated', 'authenticated', $3, now(), now())`,
    [id, email, JSON.stringify({ display_name: label })]
  );
  return { id, email };
}

export async function deleteTestUser(pool: pg.Pool, id: string) {
  await pool.query(`delete from auth.users where id = $1`, [id]);
}

/**
 * Run `fn` inside a transaction impersonating a user the way PostgREST does:
 * SET ROLE authenticated + request.jwt.claims. Both the modern JSON claim and the
 * legacy `request.jwt.claim.sub` setting are set so auth.uid() works on hosted
 * Supabase and on older local images alike.
 */
export async function asUser<T>(pool: pg.Pool, user: TestUser | null, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    if (user) {
      const claims = JSON.stringify({ sub: user.id, role: "authenticated", email: user.email });
      await client.query(`select set_config('request.jwt.claims', $1, true), set_config('request.jwt.claim.sub', $2, true), set_config('request.jwt.claim.role', 'authenticated', true)`, [claims, user.id]);
      await client.query("set local role authenticated");
    } else {
      await client.query(`select set_config('request.jwt.claims', '', true), set_config('request.jwt.claim.sub', '', true)`);
      await client.query("set local role anon");
    }
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

export async function asServiceRole<T>(pool: pg.Pool, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await client.query("set local role service_role");
    const result = await fn(client);
    await client.query("commit");
    return result;
  } catch (err) {
    await client.query("rollback").catch(() => {});
    throw err;
  } finally {
    client.release();
  }
}

/** Expect a query to be rejected (RLS violation, constraint, or permission error). */
export async function expectRejected(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (err) {
    return (err as Error).message;
  }
  throw new Error("Expected the query to be rejected, but it succeeded");
}
