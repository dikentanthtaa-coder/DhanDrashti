import type { Metadata } from "next";
import { AlertTriangle } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { isAdminConfigured } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/common/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { DeleteAccountDialog } from "@/components/settings/delete-account-dialog";

export const metadata: Metadata = { title: "Security" };

export default async function SecuritySettingsPage() {
  await requireUser();
  const deletionEnabled = isAdminConfigured();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Security" description="Password and account controls." />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Change password</CardTitle>
          <CardDescription>Changing your password signs out your other devices. Sessions expire automatically and refresh securely while you use the app.</CardDescription>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>
      <Card className="max-w-2xl border-destructive/40 bg-destructive/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base text-destructive">
            <AlertTriangle className="size-4" aria-hidden="true" /> Danger zone
          </CardTitle>
          <CardDescription>
            Deleting your account permanently removes your profile, accounts, transactions, receipts, budgets, savings goals, recurring
            schedules and notifications. This cannot be undone.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!deletionEnabled ? (
            <p className="text-sm text-muted-foreground">
              Self-service deletion is not enabled on this deployment (the server-only Supabase secret key is not configured). Contact the
              operator to delete your account.
            </p>
          ) : null}
          <div>
            <DeleteAccountDialog enabled={deletionEnabled} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
