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

  // ✅ Siempre resolvemos URL absoluta
  const targetUrl = new URL((data.url || "/"), self.location.origin).href;

  const options = {
    body: data.body || "",
    icon: data.icon || "/icon-192.png",
    badge: data.badge || "/icon-192.png",
    data: { url: targetUrl },

    // (Opcional) evita que se apilen muchas notis iguales
    // tag: data.type || "decom",
    // renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = (event.notification.data && event.notification.data.url) || (new URL("/", self.location.origin)).href;

  event.waitUntil((async () => {
    // ✅ Busca si ya hay una ventana abierta de tu PWA
    const allClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    // 1) Si existe una ventana, la enfocamos y navegamos ahí (NO abre otra)
    for (const client of allClients) {
      // Nos aseguramos que sea del mismo origen
      try {
        const clientUrl = new URL(client.url);
        const targetUrl = new URL(url);

        if (clientUrl.origin === targetUrl.origin) {
          await client.focus();

          // Si no está en la misma URL, navegamos sin abrir nueva instancia
          if (client.url !== url) {
            await client.navigate(url);
          }
          return;
        }
      } catch (e) {}
    }

    // 2) Si no hay ninguna abierta, abrimos UNA
    await self.clients.openWindow(url);
  })());
});
