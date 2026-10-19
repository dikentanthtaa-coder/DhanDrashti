import { serwist } from "@serwist/next/config";

/**
 * Serwist "configurator" mode: the service worker is built by `serwist build`
 * after `next build`, which keeps the pipeline compatible with Turbopack.
 */
export default serwist({
  swSrc: "src/sw.ts",
  swDest: "public/sw.js",
  // Private, per-user pages are never prerendered; keep the precache limited to
  // static assets and explicitly listed public pages.
  precachePrerendered: false,
  additionalPrecacheEntries: [{ url: "/~offline", revision: process.env.VERCEL_GIT_COMMIT_SHA ?? Date.now().toString() }],
  globPatterns: [".next/static/**/*.{js,css,woff2,png,svg,ico,json,webmanifest}", "public/icons/**/*"],
  maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
});
