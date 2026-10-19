# DhanDrashti

A production-quality personal finance manager for India: track daily expenses and income, manage monthly budgets with alerts, plan savings, run recurring bills, attach private receipts, and export reports — all in ₹ with Indian digit grouping, installable as a PWA, and secured by Supabase Row Level Security.

> Live deployment: **https://dhandrashti.vercel.app** (Vercel project `dhandrashti`, Supabase project `dtvfzkaquhjkipibacju`, region ap-south-1). Migrations are applied, the private receipts bucket exists, the Vercel Cron job is registered, and the end-to-end journey was run against the live site.
>
> Status: the application code, database migrations, RLS policies, PWA and tests are complete and verified locally — lint, type-check, unit/component tests, database integration tests (against both a plain `supabase/postgres` image and a full `supabase start` stack), the Playwright end-to-end journey against the local Supabase stack, and the production build. **Deployment to Vercel and the hosted Supabase project are manual steps** documented below — nothing has been deployed by the build process.

---

## Table of contents

1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [Project structure](#project-structure)
4. [Quick start (local development)](#quick-start-local-development)
5. [Environment variables](#environment-variables)
6. [Supabase setup](#supabase-setup)
7. [Database migrations](#database-migrations)
8. [Running checks and tests](#running-checks-and-tests)
9. [Accounting model](#accounting-model)
10. [Recurring transactions and Vercel Cron](#recurring-transactions-and-vercel-cron)
11. [Budget alerts and email notifications](#budget-alerts-and-email-notifications)
12. [Receipts (private storage)](#receipts-private-storage)
13. [Progressive Web App](#progressive-web-app)
14. [Vercel deployment](#vercel-deployment)
15. [Security model](#security-model)
16. [Troubleshooting](#troubleshooting)
17. [Known limitations](#known-limitations)

---

## Features

- **Authentication** — email + password sign-up with email verification, sign-in, sign-out (all devices), forgot/reset password, change password (re-authenticates first), profile settings, account deletion (receipts + all data), server-verified sessions via `@supabase/ssr`.
- **Accounts** — cash, bank, savings, credit card, other; computed balances; activate/deactivate.
- **Categories** — 18 default expense groups with 91 subcategories and 9 income categories (seeded idempotently as global, read-only rows), plus user categories with icon/colour, nesting under global or own parents, reorder, archive, delete.
- **Transactions** — expenses, income, refunds (reduce spending), transfers between own accounts, savings-goal contributions; search, filters (type, category, account, payment method, merchant, date range), sorting, server-side pagination; detail view; quick-add dialog on the dashboard; receipt attachments.
- **Dashboard** — today/month income & expenses, net cash flow, budget usage & remaining, savings rate (hidden when income is zero), tracked savings balance, period-over-period comparison, Recharts visualisations (daily trend, income vs expense, category donut, monthly comparison, budget utilisation, savings trend, payment methods, top categories), recent transactions, upcoming recurring items, budget alerts, savings-goal progress, data-driven insights.
- **Reports** — 10 presets + custom range, filters, totals, average daily spend, highest-spending day, category/subcategory/merchant/payment-method tables, period-over-period changes, CSV export (streamed, formula-injection safe, UTF-8 BOM), print-friendly view.
- **Budgets** — overall and per-category monthly budgets with start/end month and non-overlap enforcement, configurable thresholds (default 80 % and 100 %), progress, remaining, history; in-app alerts de-duplicated per budget/month/threshold; optional email alerts.
- **Savings planner** — fixed or percentage monthly target, goals with target dates, suggested monthly contributions, trend chart, transparent recommendations with "how this is calculated" notes.
- **Recurring** — daily/weekly/monthly/yearly schedules, auto-post or reminder mode, pause/resume/cancel, end dates, month-end clamping (31st → last day), missed-schedule catch-up, idempotent processing via an occurrence ledger, Vercel Cron endpoint, manual "process due now".
- **Notifications** — in-app inbox with read/unread, links to budgets/recurring.
- **PWA** — manifest, icons, install prompt, Serwist service worker (static assets only; financial data is never cached), offline page, update prompt.
- **Security** — RLS on every private table with ownership checks on related records, private receipt bucket with owner-scoped policies, CSP with nonces, security headers, server-side validation (Zod), rate limiting for sensitive operations, no secrets in the browser.

## Technology stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack, Server Components, Server Actions, `proxy.ts`) |
| Language | TypeScript 5 (`strict`) |
| UI | Tailwind CSS 4, shadcn/ui (Radix), Lucide icons, next-themes, sonner |
| Forms | React Hook Form + Zod 4 (client and server validation) |
| Charts | Recharts 3 |
| Dates/money | date-fns, date-fns-tz, decimal.js (no float arithmetic for money) |
| Backend | Supabase Postgres, Auth, Storage, RLS; `@supabase/ssr` |
| PWA | Serwist (`@serwist/next/config` + `serwist build`, Turbopack-compatible) |
| Tests | Vitest + Testing Library (unit/component), Vitest + `pg` (database/RLS integration), Playwright (e2e) |
| Hosting | Vercel (with Vercel Cron) |

## Project structure

```
src/
  app/
    (auth)/            login, signup, forgot-password, reset-password
    (app)/             protected app: dashboard, transactions, reports, budgets, savings,
                       recurring, categories, accounts, notifications, settings/*
    api/cron/recurring/  scheduled recurring processor (CRON_SECRET protected)
    api/export/transactions/  streaming CSV export
    auth/confirm/      email verification / password reset link handler
    manifest.ts        PWA manifest        ~offline/  offline fallback page
  components/
    ui/                shadcn/ui primitives
    layout/            AppSidebar, MobileNavigation, DashboardHeader, ThemeToggle, UserMenu
    common/            SummaryCard, CategorySelector, DateRangeFilter, ConfirmationDialog, ...
    charts/            chart primitives + chart components
    transactions/ dashboard/ reports/ budgets/ savings/ recurring/ categories/ accounts/ ...
  lib/
    supabase/          browser, server, admin (secret key, server-only) and proxy clients
    auth/session.ts    server-verified identity helpers
    data/              server-side data access (RPC-backed aggregations, paginated lists)
    actions/           Server Actions (validate → authorise → mutate → revalidate)
    finance/           money (Decimal), dates/timezones, calculations, recurring schedule maths
    validation/        Zod schemas shared by client forms and server actions
    types/database.ts  database types
    csv.ts email.ts budget-alerts.ts constants.ts format.ts env.ts
  proxy.ts             session refresh, route protection, CSP nonce
  sw.ts                service worker source (built to public/sw.js)
supabase/migrations/   SQL migrations (schema, RLS, functions, storage, seed)
scripts/               icon generation, seed generation, migration runner
tests/                 unit/, components/, integration/, e2e/
```

## Quick start (local development)

Prerequisites: Node.js ≥ 20.9 (tested on 24), pnpm ≥ 9, a Supabase project (free tier is fine). Docker is optional (for running database integration tests locally).

```bash
pnpm install
cp .env.example .env.local        # fill in the values from your Supabase project
pnpm dev                          # http://localhost:3000
```

Then apply the database migrations (see [Database migrations](#database-migrations)) and sign up. Email verification requires the Supabase Auth email settings described below; for local testing you can temporarily disable "Confirm email" in the Supabase dashboard.

## Environment variables

Copy `.env.example` to `.env.local`. Real `.env*` files are git-ignored.

| Variable | Scope | Required | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | public | yes | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | public | yes | Publishable (or legacy anon) key. Safe to expose: RLS protects every table. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is accepted as a fallback. |
| `NEXT_PUBLIC_SITE_URL` | public | yes (prod) | Base URL used in verification/reset links, e.g. `https://dhandrashti.example`. Falls back to the request host. |
| `SUPABASE_SECRET_KEY` | server only | optional | Secret (service-role) key. Used **only** for account deletion (`auth.admin.deleteUser`), the cron recurring processor, and e2e test user management. Never prefixed with `NEXT_PUBLIC_`, never imported by client code (`src/lib/supabase/admin.ts` imports `server-only`). Without it, account deletion shows a "not enabled" message and the cron endpoint returns 503. |
| `CRON_SECRET` | server only | for cron | Shared secret Vercel Cron sends as `Authorization: Bearer …`. Generate with `openssl rand -hex 32`. |
| `RESEND_API_KEY`, `EMAIL_FROM` | server only | optional | Enables email delivery of budget alerts via Resend. Both must be set; otherwise alerts are in-app only and the Settings page says so. |
| `DATABASE_URL` | test only | optional | Postgres connection string for `pnpm test:integration` and `scripts/apply-migrations.mjs`. |
| `PLAYWRIGHT_BASE_URL` | test only | optional | Target for `pnpm test:e2e` (defaults to a locally started production server). |

## Supabase setup

1. **Create a project** at https://supabase.com/dashboard. Note the Project URL and the publishable key (Project Settings → API Keys). Copy the secret key only into server-side environments (Vercel env vars, `.env.local`).
2. **Apply the migrations** — see the next section. This creates all tables, RLS policies, functions, the private `receipts` bucket + storage policies, and seeds the default categories.
3. **Authentication → Providers → Email**: keep *Enable email provider* on, keep *Confirm email* on (required for the verification flow). Optionally enable *Secure email change* and *Secure password change*.
4. **Authentication → URL Configuration**:
   - *Site URL*: `http://localhost:3000` for development, your production URL in production.
   - *Redirect URLs*: add `http://localhost:3000/auth/confirm` and `https://<your-domain>/auth/confirm` (and the Vercel preview pattern `https://*-<team>.vercel.app/auth/confirm` if you use previews).
5. **Authentication → Email Templates**: the app uses the *token hash* flow for SSR. Change the links in the **Confirm signup**, **Reset password** and **Change email** templates to point at the app's handler, for example:
   - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/dashboard`
   - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery&next=/reset-password`
   - Change email: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email_change&next=/settings/profile`
   **Free-tier note:** email templates can only be edited after a custom SMTP provider is configured (Authentication → SMTP Settings; Resend, Brevo, Postmark, etc. with a domain you own). Until then Supabase's built-in sender is used, which allows only ~2 emails per hour (sign-ups beyond that show "Too many attempts") and sends its default templates. The default templates still work with this app: the confirmation link goes through Supabase and lands on `/auth/confirm?code=…` (PKCE), which the app exchanges for a session — but that link must be opened in the same browser that started the sign-up. Custom SMTP + the token-hash templates above remove both limitations.
6. **Authentication → Rate limits**: defaults are fine; Supabase Auth already rate-limits sign-in, sign-up and password reset.
7. **Storage**: the migration creates the private `receipts` bucket (5 MB, JPEG/PNG/WebP/PDF) with owner-scoped policies. Verify under Storage → Policies that the four `receipts: … own` policies exist and that the bucket is **not** public.
8. **Verify RLS**: Database → Tables — every table listed in `supabase/migrations/20261019000002_rls.sql` must show "RLS enabled". The integration tests (below) prove the policies behave correctly.

## Database migrations

Migrations live in `supabase/migrations/` and are safe to re-run (idempotent `create … if not exists`, `drop policy if exists`, upserts by slug for seed data):

| File | Contents |
|---|---|
| `20261019000001_schema.sql` | tables, constraints, indexes, `updated_at` triggers, integrity triggers, new-user bootstrap |
| `20261019000002_rls.sql` | RLS on every private table; ownership helpers; per-command policies |
| `20261019000003_functions.sql` | aggregation RPCs, budget alerts, recurring processor, rate limiter |
| `20261019000004_storage.sql` | `receipts` bucket and storage policies |
| `20261019000005_seed_categories.sql` | default categories (generated from `scripts/taxonomy.mjs`) |

Apply them with any **one** of:

- **Supabase CLI** (recommended): `supabase link --project-ref <ref>` then `supabase db push`.
- **Migration runner script**: `DATABASE_URL='postgresql://postgres.[ref]:[password]@…pooler.supabase.com:5432/postgres' node scripts/apply-migrations.mjs` (tracks applied files in `public._dhandrashti_migrations`).
- **SQL editor**: paste each file in order.

The migrations only touch the `public` schema, the `auth.users` trigger, `storage.buckets` and `storage.objects` policies.

## Running checks and tests

```bash
pnpm lint              # ESLint (next/core-web-vitals + typescript)
pnpm typecheck         # tsc --noEmit (strict)
pnpm test              # unit + component tests (Vitest, jsdom)
pnpm test:integration  # database/RLS tests — needs DATABASE_URL (see below)
pnpm test:e2e          # Playwright — needs a Supabase project + SUPABASE_SECRET_KEY
pnpm build             # next build + serwist build (service worker)
pnpm check             # lint + typecheck + unit tests
```

**Local Supabase (optional, recommended)** — the repo includes `supabase/config.toml` for the Supabase CLI (installed as a dev dependency). `pnpm exec supabase start` launches Postgres, Auth, PostgREST, Storage and Mailpit in Docker, applies the migrations automatically and prints local keys; `pnpm exec supabase status -o env` shows them. Put `API_URL`/`PUBLISHABLE_KEY`/`SECRET_KEY`/`DB_URL` into `.env.local` as `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SECRET_KEY` and `DATABASE_URL`. Verification emails land in Mailpit (http://127.0.0.1:54324). `pnpm exec supabase stop` shuts it down.

**Database integration tests** run real SQL against a Postgres that has the migrations applied and impersonate users exactly like PostgREST (`SET ROLE authenticated` + JWT claims). They verify SELECT/INSERT/UPDATE/DELETE isolation, related account/category/goal ownership, storage folder isolation, recurring idempotency and alert de-duplication. Locally:

```bash
docker run -d --name dhandrashti-pg -e POSTGRES_PASSWORD=postgres -p 54329:5432 supabase/postgres:17.6.1.054
DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres node scripts/apply-migrations.mjs
DATABASE_URL=postgres://postgres:postgres@localhost:54329/postgres pnpm test:integration
```

They can also run against a hosted project's direct connection string (they create and delete throwaway `auth.users` rows).

**End-to-end tests** (Playwright) cover: register → simulated email verification → sign in → add expense/income → create budget → check dashboard totals → filter report → export CSV → create recurring schedule → upload and view a receipt → sign out → private routes blocked → isolation between two users. They need `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` and `SUPABASE_SECRET_KEY` (to create/confirm/delete test users, which simulates the verification email). Install browsers once with `pnpm exec playwright install chromium`. Tests use synthetic data only.

## Accounting model

One consistent policy is implemented in SQL (`period_summary`, `category_totals`, `account_balances`, …) and mirrored in `src/lib/finance/calculations.ts`:

| Entry | Spending | Income | Account effect |
|---|---|---|---|
| Expense | + amount | — | − from account |
| Expense marked **refund** | − amount (same category) | — | + to account |
| Income | — | + amount | + to account |
| Transfer (own accounts) | — | — | − source, + destination |
| Transfer tagged with a savings goal | — | — | counts toward the goal (− if it leaves the goal's linked account) |

- **Net cash flow** = income − net spending. **Savings rate** = net cash flow ÷ income, shown only when income > 0.
- **Account balance** = opening balance + income + refunds + transfers in − expenses − transfers out. Credit-card accounts show a negative balance (amount owed). A card purchase is an expense on the card account; the repayment is a transfer from the bank — spending is counted once.
- **Loans**: record interest as an expense (Financial Expenses → Loan Interest) and principal as a transfer to a liability account of type *Other*.
- **Tracked savings balance** = sum of balances of accounts of type *Savings*. Savings goals track tagged contributions and are never confused with bank balances; "calculated savings" (income − expenses) is a reporting figure, not cash in an account.
- **Budgets** count expenses net of refunds for the category and its subcategories (or all expenses for the overall budget); transfers and unconfirmed reminder occurrences are excluded.
- **Timezone**: transaction dates are calendar dates; "today", weeks and months are computed in the profile timezone (default `Asia/Kolkata`).
- **Currency**: INR only in this version (stored per row for future multi-currency work).
- Money is stored as `NUMERIC(14,2)`; authoritative totals come from Postgres; the app uses `decimal.js` for any further arithmetic.

## Recurring transactions and Vercel Cron

Schedules are generated by `public.process_recurring_for_user`, which inserts an **occurrence ledger row** with a unique `(schedule, scheduled_date)` key before posting the transaction, so repeated or concurrent runs never create duplicates. Missed dates are caught up (every due date up to today is generated). Monthly/yearly dates clamp to month-end and remember the anchor day (31 Jan → 28 Feb → 31 Mar).

Generation happens only when:

1. The scheduler calls `GET /api/cron/recurring` with `Authorization: Bearer $CRON_SECRET`, which runs `process_all_recurring_transactions()` with the secret key (service role, executable only by `service_role`), or
2. The user clicks **Process due now** on the Recurring page (`process_my_recurring_transactions()` under their own session).

Opening the dashboard never creates financial entries.

**Vercel Cron configuration** — `vercel.json` already contains:

```json
{ "crons": [{ "path": "/api/cron/recurring", "schedule": "30 0 * * *" }] }
```

Set `CRON_SECRET` and `SUPABASE_SECRET_KEY` in the Vercel project; Vercel sends the secret automatically. The schedule runs daily at 00:30 UTC (06:00 IST). Verify after deployment under Vercel → Project → Cron Jobs, and by calling the endpoint manually:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" https://<your-domain>/api/cron/recurring
```

Until the cron job is configured and verified, automatic generation is **not** active — only the manual button works.

## Budget alerts and email notifications

After every expense mutation the server calls `check_budget_alerts`, which inserts at most one notification per `(budget, month, threshold)` using a unique `dedupe_key`; concurrent calls are safe (`ON CONFLICT DO NOTHING`). Thresholds are configurable per budget (default 80 % and 100 %).

Email delivery is optional: set `RESEND_API_KEY` and `EMAIL_FROM`, and the user must enable *Email alerts* in Settings → Profile. When these are not configured the app clearly states that alerts are in-app only. No emails are claimed to be sent otherwise.

## Receipts (private storage)

- Bucket `receipts` is private; objects are stored at `<user_id>/<transaction_id>/<random-uuid>.<ext>`. The file name is generated; user filenames are never trusted.
- Storage RLS allows a user to read/write/delete only inside their own top-level folder; the `transactions.receipt_path` column has a CHECK that the path starts with the owner's id.
- Uploads go through a Server Action that verifies the transaction belongs to the caller, enforces the 5 MB limit and allowed MIME types (JPEG, PNG, WebP, PDF), checks the file's magic bytes, and rate-limits uploads. Bucket-level limits are enforced by Supabase too.
- Viewing uses short-lived signed URLs (2 minutes) created server-side after an ownership check; there are no public URLs.
- Replacing a receipt deletes the previous object; deleting a transaction or the account removes its files. Receipt contents are never logged.

## Progressive Web App

- `src/app/manifest.ts` serves the manifest (name, short name, icons incl. maskable, standalone display, theme/background colours, shortcuts).
- The service worker (`src/sw.ts`, built by `serwist build` into `public/sw.js` during `pnpm build`) precaches hashed static assets, icons and `/~offline`. Runtime caching is an explicit allow-list (Next.js static chunks, icons, fonts). **Navigations, Server Actions, `/api`, Supabase requests, CSV exports and signed receipt URLs are network-only and never stored.** The proxy also sets `Cache-Control: private, no-store` on app pages.
- When offline, navigations show `/~offline`, which tells the user a secure connection is required and that nothing was saved. There is no offline transaction queue by design.
- Updates: a new worker waits until the user accepts the "Update" toast; the page reloads once the new version takes control. Registration happens only in production builds and does not interfere with sign-in, sign-out or password reset (those routes are network-only).
- Install: Chrome/Edge/Android show the install prompt (Settings → Install app button); iOS uses Share → Add to Home Screen (hint shown in Settings).
- Icons are generated by `pnpm icons` (`scripts/generate-icons.mjs`).

## Vercel deployment

1. Push the repository to GitHub/GitLab/Bitbucket and **import it in Vercel**. Framework preset: Next.js. Build command `pnpm build` (default), install command `pnpm install`. Node.js 20 or later.
2. **Environment variables** (Production + Preview): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`, `NEXT_PUBLIC_SITE_URL` (your production domain), `SUPABASE_SECRET_KEY`, `CRON_SECRET`, optionally `RESEND_API_KEY` and `EMAIL_FROM`.
3. **Domain**: add your production domain under Settings → Domains; set `NEXT_PUBLIC_SITE_URL` to it.
4. **Supabase redirect URLs**: add `https://<domain>/auth/confirm` (and the preview pattern) under Authentication → URL Configuration; set the Site URL to the production domain.
5. **Deploy** (push to the production branch). The build runs `next build && serwist build`.
6. **Verify in production**: sign up with a real mailbox and complete verification; sign in; add a transaction and confirm it appears on the dashboard; upload a receipt and open it; open DevTools → Application → Manifest / Service Workers to confirm installability and that only static assets are cached; call the cron endpoint with the secret and confirm Vercel → Cron Jobs shows the schedule.

Nothing is deployed automatically by this repository; the steps above have to be performed by you.

## Security model

Defense in depth, documented honestly — no system is unhackable.

- **Identity** is always verified on the server (`supabase.auth.getUser()` in Server Components/Actions, `getClaims()` in the proxy). User ids are never accepted from the browser; every insert sets `user_id` from the verified session, and RLS rejects anything else.
- **Row Level Security** is enabled and forced on all private tables with explicit SELECT/INSERT/UPDATE/DELETE policies using `auth.uid()`. INSERT/UPDATE policies additionally verify ownership of referenced accounts, categories, goals and schedules. Global categories are readable but immutable. `anon` has no grants on private tables.
- **Privileged SQL**: only `handle_new_user` (auth trigger), `rate_limit_hit` and `process_all_recurring_transactions` are `SECURITY DEFINER`; all three set `search_path = ''`, are narrowly scoped, and the processor is executable by `service_role` only. All aggregation functions are `SECURITY INVOKER`, so RLS applies inside them.
- **Secrets**: the publishable key is public by design; the secret key is server-only (`server-only` import, never `NEXT_PUBLIC_`). Cron is protected by `CRON_SECRET` with constant-time comparison.
- **Sessions**: HTTP-only, `SameSite=Lax`, `Secure` cookies refreshed in the proxy; sign-out revokes all sessions; password change/reset signs out other devices and re-authenticates first.
- **Headers**: nonce-based CSP (`script-src 'self' 'nonce-…' 'strict-dynamic'`, `frame-ancestors 'none'`, `object-src 'none'`, connect/img sources limited to the app and the Supabase project), HSTS, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Cache-Control: private, no-store` on app pages.
- **Validation**: every form is validated with Zod on the client and again in the Server Action; amounts are parsed as decimals; dates are validated calendar strings; search terms are escaped before `ilike`.
- **CSRF**: Next.js Server Actions enforce same-origin (`Origin`/`Host` check); route handlers that mutate state require the cron secret; the CSV export is a GET that only reads the caller's own data.
- **Abuse protection**: Supabase Auth rate limits authentication; a Postgres-backed limiter protects password change, account deletion, receipt uploads and CSV exports.
- **Uploads**: private bucket, owner-scoped paths and policies, size/MIME/magic-byte checks, generated object names, short-lived signed URLs; files are served from Supabase Storage with their own content type (never executed as app code).
- **Exports**: CSV cells are RFC 4180 quoted and formula-injection neutralised; numeric columns stay machine-readable.
- **Logging**: no passwords, tokens or receipt contents are logged; errors shown to users are generic; sign-up/reset responses are generic to avoid account enumeration.
- **Residual risks / operational controls**: enable a custom SMTP provider and Supabase's leaked-password protection and MFA options as needed; rotate `CRON_SECRET`/secret key if exposed; keep dependencies updated (`pnpm audit`); review Supabase Auth logs; back up the database (Supabase PITR on paid tiers); the service worker cannot protect a device that is already compromised; a signed URL is valid for its lifetime even if copied.

## Troubleshooting

- **"Missing required environment variable"** — copy `.env.example` to `.env.local` and restart `pnpm dev`.
- **Redirect loop / signed out immediately** — the proxy could not refresh the session: check the URL/key, and make sure the Supabase redirect URLs include `/auth/confirm`.
- **Verification link lands on `/auth/error`** — the email template must use the token-hash format shown above; links are single-use and expire.
- **`new row violates row-level security policy`** — you tried to reference another user's account/category/goal, or `user_id` does not match the session. The app maps these to friendly messages.
- **Budget creation says the period conflicts** — budgets for the same category cannot overlap; end the existing one first.
- **Cron returns 503** — `CRON_SECRET` or `SUPABASE_SECRET_KEY` is not set; 401 means the bearer token does not match.
- **Service worker not updating** — accept the "Update" toast; in DevTools → Application → Service Workers use *Update*/*Unregister* during development.
- **Integration tests: `auth.uid()` is null** — the harness sets both `request.jwt.claims` and the legacy `request.jwt.claim.sub`; ensure `DATABASE_URL` points at a database with the migrations applied.
- **Storage migration error "column public does not exist"** — handled: the migration detects older local images and only sets limits on hosted Supabase.

## Known limitations

- Single currency (INR). The schema stores a currency per row but there is no conversion.
- No offline transaction queue — deliberately, for privacy.
- Email alerts require configuring Resend; otherwise alerts are in-app only.
- Account deletion requires the server-only secret key to be configured on the deployment.
- Recurring frequencies are daily/weekly/monthly/yearly (no "every N" intervals).
- PDF export is not implemented; the print view (browser "Save as PDF") covers this.
- Budget history for a budget reflects its current limit for every month it covers; create a new budget starting next month to change limits going forward.
- Playwright e2e tests need a real Supabase project with the secret key and are therefore not run in the default `pnpm check`.
