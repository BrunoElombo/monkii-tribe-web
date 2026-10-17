/// <reference lib="webworker" />
/**
 * Monkii Tribe service worker (built by vite-plugin-pwa, injectManifest).
 *  - precaches the app shell so the PWA opens offline
 *  - caches cover art and avatars
 *  - shows web push notifications (NOT-03) and opens the right screen on click
 */
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst } from "workbox-strategies";

declare const self: ServiceWorkerGlobalScope;

const manifest = self.__WB_MANIFEST;
precacheAndRoute(manifest);
cleanupOutdatedCaches();

// New versions take over at once (same behaviour as registerType "autoUpdate")
void self.skipWaiting();
clientsClaim();

// Single-page app: every navigation gets index.html, except the API and the docs.
// In development nothing is precached, so the route is only added after a build.
if (manifest.some((entry) => (typeof entry === "string" ? entry : entry.url).endsWith("index.html"))) {
  registerRoute(new NavigationRoute(createHandlerBoundToURL("/index.html"), { denylist: [/^\/api\//, /^\/docs/] }));
}

// Cover art and avatars never change once uploaded
registerRoute(
  ({ url }) => url.pathname.startsWith("/api/v1/media/files/"),
  new CacheFirst({
    cacheName: "monkii-images",
    plugins: [new ExpirationPlugin({ maxEntries: 500, maxAgeSeconds: 60 * 60 * 24 * 60 })],
  }),
);

// ---------------------------------------------------------------- web push

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  imageUrl?: string | null;
  tag?: string;
}

self.addEventListener("push", (event) => {
  let payload: PushPayload = { title: "Monkii Tribe", body: "" };
  try {
    payload = { ...payload, ...(event.data?.json() as PushPayload) };
  } catch {
    payload.body = event.data?.text() ?? "";
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      icon: "/pwa-192.png",
      badge: "/pwa-192.png",
      tag: payload.tag,
      data: { url: payload.url ?? "/" },
      // Chrome shows the cover art in a big picture notification
      ...(payload.imageUrl ? { image: payload.imageUrl } : {}),
    } as NotificationOptions),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL((event.notification.data as { url?: string })?.url ?? "/", self.location.origin).href;

  event.waitUntil(
    (async () => {
      // Reuse an open Monkii tab when there is one
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (new URL(client.url).origin === self.location.origin && "focus" in client) {
          await client.focus();
          if ("navigate" in client) await (client as WindowClient).navigate(target).catch(() => undefined);
          return;
        }
      }
      await self.clients.openWindow(target);
    })(),
  );
});
