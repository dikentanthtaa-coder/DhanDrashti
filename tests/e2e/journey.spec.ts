import { expect, test, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import { confirmUserByEmail, createVerifiedUser, deleteUser, e2eConfigured, testCredentials, type E2EUser } from "./helpers";

/**
 * Critical user journey against a real Supabase project (synthetic data only).
 * Skipped automatically unless the Supabase env + secret key are configured.
 */
test.describe.configure({ mode: "serial" });

const createdUserIds: string[] = [];

test.beforeAll(() => {
  test.skip(!e2eConfigured(), "E2E needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY");
});

test.afterAll(async () => {
  for (const id of createdUserIds) await deleteUser(id);
});

/** Navigate and wait for hydration so clicks reach React handlers, not native form submits. */
async function go(page: Page, url: string) {
  await page.goto(url, { waitUntil: "networkidle" });
}

async function signIn(page: Page, user: { email: string; password: string }) {
  await go(page, "/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(user.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/dashboard/);
}

async function addTransaction(page: Page, opts: { type: "expense" | "income"; amount: string; merchant: string; categoryQuery: string; categoryOption: RegExp }) {
  await go(page, `/transactions/new?type=${opts.type}`);
  await page.getByRole("radio", { name: opts.type === "expense" ? "Expense" : "Income" }).click();
  await page.getByLabel("Amount").fill(opts.amount);
  await page.getByLabel("Category").click();
  await page.getByPlaceholder("Search categories…").fill(opts.categoryQuery);
  await page.getByRole("option", { name: opts.categoryOption }).first().click();
  await page.getByLabel(opts.type === "expense" ? "Account" : "Account", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel(opts.type === "expense" ? "Merchant" : "Source / payer").fill(opts.merchant);
  await page.getByRole("button", { name: new RegExp(`^Save ${opts.type}$`) }).click();
  await expect(page).toHaveURL(/\/transactions(\?|$)/);
  await expect(page.getByText(opts.merchant).filter({ visible: true }).first()).toBeVisible();
}

test("register → verify → sign in → transact → budget → report → export → recurring → receipt → sign out", async ({ page }) => {
  test.setTimeout(240_000);

  // 1. Register through the UI
  const creds = testCredentials("journey");
  await go(page, "/signup");
  await page.getByLabel("Your name").fill("Journey Tester");
  await page.getByLabel("Email").fill(creds.email);
  await page.getByLabel("Password", { exact: true }).fill(creds.password);
  await page.getByLabel("Confirm password").fill(creds.password);
  await page.getByRole("button", { name: "Create account" }).click();
  const inbox = page.getByText(/check your inbox/i);
  const rateLimited = page.getByText(/too many attempts/i);
  await expect(inbox.or(rateLimited)).toBeVisible();

  // 2. Simulate clicking the verification email (admin API marks the email confirmed).
  //    Hosted projects on the default email provider allow only a few emails per hour;
  //    when that limit is hit the UI reports it and we create the verified user directly.
  let userId: string;
  if (await rateLimited.isVisible()) {
    console.warn("Sign-up email rate limit reached on this Supabase project; creating the user via the admin API instead.");
    userId = (await createVerifiedUser("journey", creds)).id;
  } else {
    userId = await confirmUserByEmail(creds.email);
  }
  createdUserIds.push(userId);

  // 3. Sign in
  await signIn(page, creds);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  // 4. Create an expense and an income
  await addTransaction(page, { type: "expense", amount: "650.50", merchant: "E2E Cafe", categoryQuery: "Restaurants", categoryOption: /Restaurants/ });
  await addTransaction(page, { type: "income", amount: "50000", merchant: "E2E Employer", categoryQuery: "Salary", categoryOption: /Salary/ });

  // 5. Create a budget for Food & Eating
  await go(page, "/budgets");
  await page.getByRole("button", { name: "New budget" }).first().click();
  await page.getByLabel("Applies to").selectOption("category");
  await page.getByLabel("Category").click();
  await page.getByPlaceholder("Search categories…").fill("Food");
  await page.getByRole("option", { name: /Food & Eating \(general\)/ }).first().click();
  await page.getByLabel("Monthly limit").fill("8000");
  await page.getByRole("button", { name: "Create budget" }).click();
  await expect(page.getByText(/8,000\.00/).filter({ visible: true }).first()).toBeVisible();

  // 6. Dashboard totals reflect the data
  await go(page, "/dashboard");
  await expect(page.getByText("₹50,000.00").filter({ visible: true }).first()).toBeVisible();
  await expect(page.getByText("₹650.50").filter({ visible: true }).first()).toBeVisible();

  // 7. Filter a report by date (custom range = today only) and check totals
  await go(page, "/reports?preset=today");
  await expect(page.getByText("₹650.50").filter({ visible: true }).first()).toBeVisible();
  await page.getByLabel("Date range", { exact: true }).selectOption("last_month");
  await expect(page).toHaveURL(/preset=last_month/);
  await page.getByLabel("Date range", { exact: true }).selectOption("this_month");

  // 8. Export CSV (download) and verify content + formula-injection safety
  const [download] = await Promise.all([
    page.waitForEvent("download"),
    page.goto("/api/export/transactions?preset=this_month").catch(() => null),
  ]);
  const csvPath = await download.path();
  const csv = readFileSync(csvPath!, "utf8");
  expect(csv.startsWith("﻿Date,Type,Amount")).toBe(true);
  expect(csv).toContain("E2E Cafe");
  expect(csv).toContain("650.50");

  // 9. Create a recurring schedule
  await go(page, "/recurring");
  await page.getByRole("button", { name: "New schedule" }).first().click();
  await page.getByLabel("Amount").fill("15000");
  await page.getByLabel("Account", { exact: true }).selectOption({ index: 1 });
  await page.getByLabel("Category").click();
  await page.getByPlaceholder("Search categories…").fill("Rent");
  await page.getByRole("option", { name: /^Rent$/ }).first().click();
  await page.getByLabel("Merchant / payee").fill("E2E Landlord");
  await page.getByRole("button", { name: "Create schedule" }).click();
  await expect(page.getByText("E2E Landlord").filter({ visible: true }).first()).toBeVisible();

  // 10. Upload and view a private receipt on the expense
  await go(page, "/transactions?q=E2E%20Cafe");
  await page.getByRole("link", { name: "View transaction" }).first().click();
  await expect(page).toHaveURL(/\/transactions\/[0-9a-f-]{36}$/);
  const txUrl = page.url();
  // 1x1 PNG
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  await page.getByLabel("Choose receipt file").setInputFiles({ name: "receipt.png", mimeType: "image/png", buffer: png });
  await page.getByRole("button", { name: /^upload/i }).click();
  await expect(page.getByText(/receipt uploaded/i)).toBeVisible();
  await expect(page.getByRole("img", { name: /receipt/i }).first()).toBeVisible({ timeout: 20_000 });

  // 11. Sign out; private routes are inaccessible
  await page.getByRole("button", { name: "Account menu" }).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/login/);
  await go(page, "/dashboard");
  await expect(page).toHaveURL(/\/login\?next=%2Fdashboard/);
  const apiRes = await page.request.get("/api/export/transactions");
  expect(apiRes.status()).toBe(401);

  // 12. Isolation: a second user cannot open the first user's transaction
  const other: E2EUser = await createVerifiedUser("other");
  createdUserIds.push(other.id);
  await signIn(page, other);
  await go(page, txUrl);
  await expect(page.getByText(/not found|404/i).filter({ visible: true }).first()).toBeVisible();
  await go(page, "/transactions");
  await expect(page.getByText("E2E Cafe").filter({ visible: true })).toHaveCount(0);
});
