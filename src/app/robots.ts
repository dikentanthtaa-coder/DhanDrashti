import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/login", "/signup", "/forgot-password"],
        disallow: [
          "/dashboard",
          "/transactions",
          "/reports",
          "/budgets",
          "/savings",
          "/recurring",
          "/categories",
          "/accounts",
          "/notifications",
          "/settings",
          "/api/",
          "/auth/",
          "/reset-password",
        ],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
