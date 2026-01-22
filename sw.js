// sw.js (reemplaza TODO el archivo por esto)

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    // Si llega texto plano en vez de JSON
    const txt = event.data ? event.data.text() : "";
    data = { title: "DECOM", body: txt, url: "/" };
  }

  const title = data.title || "DECOM";
  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    data: { url: data.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/";

  event.waitUntil(
    (async () => {
      // Si ya hay una pestaña abierta, la enfocamos (mejor UX)
      const allClients = await clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of allClients) {
        if (client.url && client.url.includes(self.location.origin)) {
          try { await client.navigate(url); } catch (_) {}
          return client.focus();
        }
      }
      // Si no hay ninguna, abrimos nueva
      return clients.openWindow(url);
    })()
  );
});
