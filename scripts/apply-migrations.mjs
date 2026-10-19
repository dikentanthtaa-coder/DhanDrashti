// Applies supabase/migrations/*.sql in order to DATABASE_URL (local Docker or Supabase).
// Usage: DATABASE_URL=postgres://... node scripts/apply-migrations.mjs
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is required (e.g. postgres://postgres:postgres@localhost:54329/postgres)");
  process.exit(1);
}
const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const client = new pg.Client({ connectionString: url, ssl: url.includes("supabase.co") ? { rejectUnauthorized: false } : undefined });
await client.connect();
try {
  await client.query(`create table if not exists public._dhandrashti_migrations (name text primary key, applied_at timestamptz not null default now())`);
  const { rows } = await client.query(`select name from public._dhandrashti_migrations`);
  const applied = new Set(rows.map((r) => r.name));
  for (const f of files) {
    if (applied.has(f)) {
      console.log(`skip    ${f}`);
      continue;
    }
    const sql = readFileSync(join(dir, f), "utf8");
    process.stdout.write(`apply   ${f} ... `);
    await client.query("begin");
    try {
      await client.query(sql);
      await client.query(`insert into public._dhandrashti_migrations (name) values ($1)`, [f]);
      await client.query("commit");
      console.log("ok");
    } catch (err) {
      await client.query("rollback");
      console.log("FAILED");
      throw err;
    }
  }
} finally {
  await client.end();
}
