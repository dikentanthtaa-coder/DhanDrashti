/// <reference lib="webworker" />
import { CacheFirst, ExpirationPlugin, NetworkOnly, Serwist, StaleWhileRevalidate, type PrecacheEntry, type SerwistGlobalConfig } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

/**
 * DhanDrashti service worker.
 *
 * Caching policy (financial privacy first):
 *  - Precache: hashed static assets under /_next/static, icons and the /~offline page.
 *  - Runtime caching is an explicit allow-list: immutable Next.js chunks, icons and
 *    font files only. Everything else — HTML navigations, Server Actions, /api,
 *    Supabase auth/data/storage, CSV exports, signed receipt URLs — is NetworkOnly
 *    and never written to Cache Storage.
 *  - Offline: document requests fall back to /~offline.
 *  - Updates: a waiting worker activates only after the user chooses "Update".
 */
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: false,
  clientsClaim: true,
  navigationPreload: false,
  runtimeCaching: [
    {
      matcher: ({ sameOrigin, url, request }) =>
        sameOrigin && request.method === "GET" && url.pathname.startsWith("/_next/static/"),
      handler: new CacheFirst({
        cacheName: "next-static-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 128, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    {
      matcher: ({ sameOrigin, url, request }) =>
        sameOrigin && request.method === "GET" && (url.pathname.startsWith("/icons/") || /\.(?:woff2?|ttf|otf)$/i.test(url.pathname)),
      handler: new StaleWhileRevalidate({
        cacheName: "static-ui-assets",
        plugins: [new ExpirationPlugin({ maxEntries: 32, maxAgeSeconds: 30 * 24 * 60 * 60 })],
      }),
    },
    // Everything else: straight to the network, nothing stored.
    {
      matcher: () => true,
      handler: new NetworkOnly(),
    },
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher: ({ request }) => request.destination === "document",
      },
    ],
  },
});

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

serwist.addEventListeners();
