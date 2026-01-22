self.addEventListener("install", (event) => {
  // ✅ Asegura que el SW nuevo tome control lo antes posible
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  // ✅ Asegura que controle clientes existentes (evita “reinicios” raros)
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) {}

  const title = data.title || "DECOM";

  // ✅ Normalizamos a URL dentro del scope del repo (GitHub Pages project)
  const rawUrl = (data.url || "feed.html");
  const targetUrl = new URL(rawUrl, self.registration.scope).href;

  // ✅ NUEVO: id para abrir el anuncio/video exacto
  const openId = (data.id ?? null);

  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",

    // ✅ Guardamos destino + id para el click
    data: { url: targetUrl, id: openId },

    // Opcional: agrupa notificaciones por tipo (si quieres)
    // tag: data.type || "decom",
    // renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // ✅ Lee url + id desde la notificación
  const raw = (event.notification.data && event.notification.data.url) || "feed.html";
  const openId = (event.notification.data && event.notification.data.id) || "";

  // ✅ Resolver dentro del scope del repo (evita 404 de GitHub Pages)
  const targetUrl = new URL(raw, self.registration.scope);

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    // ✅ Si ya hay una ventana abierta: SOLO focus + postMessage (sin navigate)
    for (const client of allClients) {
      try {
        const clientUrl = new URL(client.url);

        if (clientUrl.origin === targetUrl.origin) {
          await client.focus();

          // ✅ Mandamos url + id (para que el feed salte al item exacto)
          client.postMessage({
            type: "DECOM_PUSH_OPEN",
            url: targetUrl.href,
            id: openId || ""
          });

          return; // ✅ no abrir otra ni navegar
        }
      } catch (e) {}
    }

    // ✅ Si NO hay ventana: abrir UNA sola vez feed.html con ?open=...&id=...
    const openParam = encodeURIComponent(targetUrl.href);
    const idParam = encodeURIComponent(openId || "");
    const openUrl = new URL(`feed.html?open=${openParam}&id=${idParam}`, self.registration.scope).href;

    await self.clients.openWindow(openUrl);
  })());
});
