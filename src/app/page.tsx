import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, BarChart3, BellRing, CalendarClock, Lock, PiggyBank, Receipt, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { isSupabaseConfigured } from "@/lib/env";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { BrandLogo } from "@/components/common/brand-logo";

export const metadata: Metadata = {
  title: `${APP_NAME} · Track expenses, budgets and savings in ₹`,
  description: APP_DESCRIPTION,
  alternates: { canonical: "/" },
};

const FEATURES = [
  { icon: Wallet, title: "Every rupee, recorded", text: "Add expenses, income, refunds and transfers in seconds with Indian currency formatting." },
  { icon: BarChart3, title: "Reports that explain", text: "Daily trends, category breakdowns, merchants and payment methods for any date range, with CSV export." },
  { icon: BellRing, title: "Budgets with alerts", text: "Monthly budgets per category with 80% and 100% warnings, so overspending never surprises you." },
  { icon: PiggyBank, title: "Savings planner", text: "Set goals, see suggested monthly contributions and transparent recommendations based on your data." },
  { icon: CalendarClock, title: "Recurring bills", text: "Rent, EMIs, subscriptions and salary post themselves on schedule, or remind you to confirm." },
  { icon: Receipt, title: "Private receipts", text: "Attach bills and invoices to transactions in a private, owner-only store." },
];

export default async function HomePage() {
  if (isSupabaseConfigured()) {
    const user = await getCurrentUser();
    if (user) redirect("/dashboard");
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 font-semibold" aria-label={`${APP_NAME} home`}>
            <BrandLogo size={36} />
            <span className="text-lg tracking-tight">{APP_NAME}</span>
          </Link>
          <nav className="flex items-center gap-2" aria-label="Account">
            <ThemeToggle />
            <Button asChild variant="ghost">
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/signup">
                Get started <ArrowRight data-icon="inline-end" />
              </Link>
            </Button>
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section className="mx-auto grid w-full max-w-6xl gap-10 px-4 py-16 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-24">
          <div className="flex flex-col gap-6">
            <span className="inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium text-muted-foreground">
              <Lock className="size-3.5" aria-hidden="true" /> Private by design · Installable app
            </span>
            <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
              Know where your money goes, in ₹.
            </h1>
            <p className="max-w-prose text-lg text-muted-foreground">
              {APP_NAME} is a personal finance tracker for India: daily expenses, monthly budgets with alerts, recurring bills,
              savings goals and clear reports — all in one fast, installable web app.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href="/signup">
                  Create a free account <ArrowRight data-icon="inline-end" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">I already have an account</Link>
              </Button>
            </div>
            <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2">
                <ShieldCheck className="size-4 text-primary" aria-hidden="true" /> Row-level security
              </li>
              <li className="flex items-center gap-2">
                <Smartphone className="size-4 text-primary" aria-hidden="true" /> Works on phone, tablet and desktop
              </li>
            </ul>
          </div>
          <div className="rounded-2xl border bg-card p-6 shadow-sm" aria-hidden="true">
            <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
              <span>October 2026</span>
              <span>Net cash flow</span>
            </div>
            <div className="mb-6 text-3xl font-semibold text-primary">+₹18,450.00</div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              {[
                ["Income", "₹50,000.00", "text-income"],
                ["Expenses", "₹31,550.00", "text-expense"],
                ["Food budget", "81% used", "text-status-serious"],
                ["Emergency fund", "₹1,25,000 / ₹2,00,000", "text-foreground"],
              ].map(([k, v, c]) => (
                <div key={k} className="rounded-xl border bg-background p-3">
                  <div className="text-xs text-muted-foreground">{k}</div>
                  <div className={`mt-1 font-semibold ${c}`}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-muted/30" aria-labelledby="features">
          <div className="mx-auto w-full max-w-6xl px-4 py-16 lg:px-8">
            <h2 id="features" className="text-2xl font-semibold tracking-tight">
              Everything a household budget needs
            </h2>
            <p className="mt-2 max-w-prose text-muted-foreground">Built for everyday Indian spending — from chai to EMIs.</p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {FEATURES.map((f) => (
                <li key={f.title} className="rounded-2xl border bg-card p-5">
                  <f.icon className="size-6 text-primary" aria-hidden="true" />
                  <h3 className="mt-3 font-semibold">{f.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between lg:px-8">
          <span>© {new Date().getFullYear()} {APP_NAME}. Your data belongs to you.</span>
          <nav className="flex gap-4" aria-label="Footer">
            <Link href="/login" className="hover:text-foreground">Sign in</Link>
            <Link href="/signup" className="hover:text-foreground">Create account</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
