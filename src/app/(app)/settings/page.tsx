import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, Shield, Smartphone, Tags, User, Wallet } from "lucide-react";
import { requireUserWithProfile } from "@/lib/auth/session";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { InstallPrompt } from "@/components/settings/install-prompt";

export const metadata: Metadata = { title: "Settings" };

const LINKS = [
  { href: "/settings/profile", title: "Profile", description: "Name, timezone and alert preferences", icon: User },
  { href: "/settings/security", title: "Security", description: "Change password, delete account", icon: Shield },
  { href: "/categories", title: "Categories", description: "Create, edit, reorder and archive your categories", icon: Tags },
  { href: "/accounts", title: "Accounts", description: "Cash, bank, savings and credit cards", icon: Wallet },
];

export default async function SettingsPage() {
  const { user, profile } = await requireUserWithProfile();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Settings" description={user.email ?? undefined} />
      <div className="grid gap-4 md:grid-cols-2">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} className="group rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50">
            <Card className="h-full transition-colors group-hover:bg-muted/50">
              <CardHeader className="flex flex-row items-center gap-3">
                <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary" aria-hidden="true">
                  <l.icon className="size-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <CardTitle className="text-base">{l.title}</CardTitle>
                  <CardDescription>{l.description}</CardDescription>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Preferences</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-2 text-sm">
            <span className="text-muted-foreground">Currency</span>
            <span>INR (₹)</span>
            <span className="text-muted-foreground">Timezone</span>
            <span>{profile.timezone}</span>
            <span className="text-muted-foreground">Email alerts</span>
            <span>{profile.email_alerts_enabled ? "On" : "Off"}</span>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="size-4" aria-hidden="true" /> Install the app
            </CardTitle>
            <CardDescription>Add DhanDrashti to your home screen for an app-like experience. Your data is never stored offline.</CardDescription>
          </CardHeader>
          <CardContent>
            <InstallPrompt />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
