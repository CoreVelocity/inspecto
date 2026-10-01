/* INSPECTO HANDOVER — service worker.
   A service worker sits in front of the browser and answers requests itself. An older one on
   this site was answering with its own saved copy of the app, which is why the CRM opened on a
   month-old version and then reloaded itself into the current one.
   This one deliberately caches NOTHING of the app. The page is a few kilobytes and must always
   come from the server; the code file's name carries its build number, so the browser can cache
   that safely on its own without help from here.
   It also deletes every cache an earlier worker left behind, and takes over immediately rather
   than waiting for every tab to close. Push notifications keep working. */

self.addEventListener("install", () => {
  self.skipWaiting();                       // don't wait for old tabs to close
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));   // clear anything cached previously
    await self.clients.claim();                              // take over open tabs now
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const isPage = req.mode === "navigate" || req.destination === "document";
  if (isPage) {
    // always fetch the page fresh; only fall back to whatever the browser has if truly offline
    event.respondWith(
      fetch(req, { cache: "no-store" }).catch(() => fetch(req).catch(() => caches.match(req)))
    );
  }
  // everything else is left alone for the browser to handle normally
});

/* ---- push notifications ---- */
self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; }
  catch (e) { d = { body: event.data ? event.data.text() : "" }; }
  event.waitUntil(self.registration.showNotification(
    d.title || "Inspecto Handover",
    { body: d.body || "", icon: d.icon, badge: d.badge, data: d.data || {}, tag: d.tag }
  ));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of all) { if ("focus" in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow("./");
  })());
});
