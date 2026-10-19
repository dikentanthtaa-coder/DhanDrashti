import type { Metadata, Viewport } from "next";
import { headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";
import { APP_DESCRIPTION, APP_NAME } from "@/lib/constants";

const geistSans = Geist({ variable: "--font-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: `${APP_NAME} · Personal finance tracker in ₹`, template: `%s · ${APP_NAME}` },
  description: APP_DESCRIPTION,
  applicationName: APP_NAME,
  keywords: ["expense tracker", "budget app India", "personal finance", "savings planner", "INR expense manager", "DhanDrashti"],
  openGraph: {
    type: "website",
    siteName: APP_NAME,
    title: `${APP_NAME} · Personal finance tracker in ₹`,
    description: APP_DESCRIPTION,
    url: siteUrl,
    images: [{ url: "/og.png", width: 1200, height: 630, alt: `${APP_NAME} dashboard preview` }],
    locale: "en_IN",
  },
  twitter: { card: "summary_large_image", title: APP_NAME, description: APP_DESCRIPTION, images: ["/og.png"] },
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, statusBarStyle: "default", title: APP_NAME },
  formatDetection: { telephone: false },
  icons: {
    icon: [{ url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  robots: { index: true, follow: true },
};

/**
 * Every page is rendered per request so the CSP nonce generated in src/proxy.ts
 * is applied to all scripts (statically prerendered HTML cannot carry a nonce).
 * Private pages are dynamic anyway; the few public pages are cheap to render.
 */
export const dynamic = "force-dynamic";

export const viewport: Viewport = {
  themeColor: "#0f766e",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Per-request CSP nonce from src/proxy.ts, forwarded to libraries that inject inline scripts.
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  return (
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Providers nonce={nonce}>{children}</Providers>
      </body>
    </html>
  );
}
