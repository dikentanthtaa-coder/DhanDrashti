import { defineConfig } from "vitest/config";

/**
 * Integration tests run SQL against a real Postgres with the migrations applied
 * (local Docker `supabase/postgres` or a Supabase connection string). They
 * exercise RLS, ownership checks, recurring idempotency and alert de-duplication
 * by impersonating users exactly as PostgREST does (SET ROLE + JWT claims).
 */
export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    globals: true,
    include: ["tests/integration/**/*.test.ts"],
    testTimeout: 60_000,
    hookTimeout: 120_000,
    fileParallelism: false,
  },
});
