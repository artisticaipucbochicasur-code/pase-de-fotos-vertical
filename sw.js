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

  // ✅ Normalizamos a URL absoluta
  const rawUrl = (data.url || "/feed.html");
const targetUrl = new URL(rawUrl, self.registration.scope).href;

  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",

    // ✅ Guardamos destino para el click
    data: { url: targetUrl },

    // Opcional: agrupa notificaciones por tipo (si quieres)
    // tag: data.type || "decom",
    // renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  // Si no viene url, mandamos al feed
  const raw = (event.notification.data && event.notification.data.url) || "/feed.html";
  const targetUrl = new URL(raw, self.location.origin);

  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    // ✅ Si ya hay una ventana abierta: SOLO focus + postMessage
    // ❌ NO navigate (esto es lo que te genera el "doble header")
    for (const client of allClients) {
      try {
        const clientUrl = new URL(client.url);

        if (clientUrl.origin === targetUrl.origin) {
          await client.focus();

          // Le decimos al FEED qué abrir (tab/deeplink)
          client.postMessage({
            type: "DECOM_PUSH_OPEN",
            url: targetUrl.href,
          });

          return; // ✅ importante: no abrir otra ni navegar
        }
      } catch (e) {}
    }

    // ✅ Si NO hay ventana: abrimos UNA sola vez feed.html con "open"
  const openParam = encodeURIComponent(targetUrl.href);
const openUrl = new URL(`feed.html?open=${openParam}`, self.registration.scope).href;
await self.clients.openWindow(openUrl);

  })());
});


