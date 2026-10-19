import type { Metadata } from "next";
import { requireUserWithProfile } from "@/lib/auth/session";
import { isEmailConfigured } from "@/lib/email";
import { DEFAULT_TIMEZONE } from "@/lib/constants";
import { PageHeader } from "@/components/common/page-header";
import { ProfileForm } from "@/components/settings/profile-form";
import { AvatarUploader } from "@/components/settings/avatar-uploader";
import { getAvatarUrl } from "@/lib/data/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

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
  const { user, profile } = await requireUserWithProfile();
  const avatarUrl = await getAvatarUrl(profile.avatar_path, user.id);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Profile" description="How DhanDrashti addresses you and interprets dates." />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Photo</CardTitle>
          <CardDescription>Shown in the header. Stored privately; only you can see it.</CardDescription>
        </CardHeader>
        <CardContent>
          <AvatarUploader name={profile.display_name} avatarUrl={avatarUrl} />
        </CardContent>
      </Card>
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle className="text-base">Personal details</CardTitle>
          <CardDescription>Your name, timezone and alert preferences.</CardDescription>
        </CardHeader>
        <CardContent>
          <ProfileForm
            displayName={profile.display_name}
            timezone={profile.timezone}
            emailAlertsEnabled={profile.email_alerts_enabled}
            emailConfigured={isEmailConfigured()}
            timezones={timezoneList(profile.timezone)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
