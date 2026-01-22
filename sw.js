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
  const targetUrl = new URL(rawUrl, self.location.origin).href;

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

  // ✅ Si no viene url, mandamos al feed para evitar abrir páginas internas con header
  const raw = (event.notification.data && event.notification.data.url) || "/feed.html";
  const targetUrl = new URL(raw, self.location.origin).href;

  event.waitUntil((async () => {
    // ✅ Busca ventanas de tu PWA (aunque estén "uncontrolled")
    const allClients = await self.clients.matchAll({
      type: "window",
      includeUncontrolled: true,
    });

    // 1) Si existe una ventana abierta, la enfocamos y le mandamos el deep-link
    //    (NO abrimos otra ventana => evita doble header y reinicios)
    for (const client of allClients) {
      try {
        const clientUrl = new URL(client.url);
        const tUrl = new URL(targetUrl);

        if (clientUrl.origin === tUrl.origin) {
          await client.focus();

          // ✅ En vez de abrir otra ventana, le decimos a la app a dónde ir
          // (tu feed debe escuchar este mensaje para navegar/tab)
          client.postMessage({ type: "DECOM_PUSH_OPEN", url: targetUrl });

          // ✅ Fallback: si el cliente no navega por postMessage, forzamos navigate
          // (Esto NO crea una segunda instancia, solo navega la existente)
          try {
            await client.navigate(targetUrl);
          } catch (e) {}

          return;
        }
      } catch (e) {}
    }

    // 2) Si no hay ninguna abierta, abrimos UNA sola
    await self.clients.openWindow(targetUrl);
  })());
});
