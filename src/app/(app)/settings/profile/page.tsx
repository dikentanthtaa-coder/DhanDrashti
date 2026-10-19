import type { Metadata } from "next";
import { requireUserWithProfile } from "@/lib/auth/session";
import { isEmailConfigured } from "@/lib/email";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { PageHeader } from "@/components/common/page-header";
import { ProfileForm } from "@/components/settings/profile-form";

export const metadata: Metadata = { title: "Profile" };

function timezoneList(current: string): string[] {
  let zones: string[] = [];
  try {
    zones = Intl.supportedValuesOf("timeZone");
  } catch {
    zones = [DEFAULT_TIMEZONE, "UTC"];
  }
  const set = new Set([DEFAULT_TIMEZONE, current, ...zones]);
  return [...set];
}

export default async function ProfileSettingsPage() {
  const { profile } = await requireUserWithProfile();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="How DhanDrashti addresses you and interprets dates." />
      <ProfileForm
        displayName={profile.display_name}
        timezone={profile.timezone}
        emailAlertsEnabled={profile.email_alerts_enabled}
        emailConfigured={isEmailConfigured()}
        timezones={timezoneList(profile.timezone)}
      />
    </div>
  );
}
