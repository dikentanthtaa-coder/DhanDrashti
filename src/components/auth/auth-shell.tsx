import Link from "next/link";
import { APP_NAME } from "@/lib/constants";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { BrandLogo } from "@/components/common/brand-logo";

export function AuthShell({
  title,
  description,
  children,
  footer,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center bg-muted/40 px-4 py-10">
      <Link href="/" className="mb-6 flex items-center gap-2 text-lg font-semibold" aria-label={`${APP_NAME} home`}>
        <BrandLogo size={40} />
        {APP_NAME}
      </Link>
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {footer ? <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div> : null}
    </main>
  );
}
