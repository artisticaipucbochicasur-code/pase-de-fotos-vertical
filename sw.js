// =====================================
// 🚀 SERVICE WORKER DE DECOM
// =====================================


// =====================================
// INSTALACIÓN DEL SERVICE WORKER
// =====================================

self.addEventListener("install", (event) => {

  self.skipWaiting();

});


// =====================================
// ACTIVACIÓN DEL SERVICE WORKER
// =====================================

self.addEventListener("activate", (event) => {

  event.waitUntil(

    (async()=>{

      await self.clients.claim();


      const cacheNames =
        await caches.keys();


      await Promise.all(

        cacheNames.map(
          cache => caches.delete(cache)
        )

      );


    })()

  );

});


// =====================================
// 🔔 PUSH NOTIFICATIONS
// =====================================

self.addEventListener("push", (event) => {

  let data = {};

  try {

    data = event.data
      ? event.data.json()
      : {};

  } catch (e) {}


  const title = data.title || "DECOM";


  // ✅ Normalizamos a URL absoluta

  const rawUrl = data.url || "/fotos.html";


  const targetUrl = new URL(
    rawUrl,
    self.registration.scope
  ).href;



  const options = {

    body: data.body || "",

    icon: data.icon || "/icon-192.png",

    badge: data.badge || "/icon-192.png",


    // ✅ Guardamos destino para el click

    data: {
      url: targetUrl
    },


    // Opcional:
    // tag: data.type || "decom",
    // renotify: true,

  };


  event.waitUntil(
    self.registration.showNotification(
      title,
      options
    )
  );

});


// =====================================
// 👆 CLICK EN NOTIFICACIÓN
// =====================================

self.addEventListener("notificationclick", (event) => {

  event.notification.close();


  // Si no viene URL, mandamos a fotos.html

  const raw =
    (event.notification.data &&
     event.notification.data.url)
     || "/fotos.html";


  const targetUrl = new URL(
    raw,
    self.location.origin
  );


  event.waitUntil(
    (async () => {


      const allClients =
        await self.clients.matchAll({

          type: "window",

          includeUncontrolled: true,

        });



      // ✅ Si ya hay una ventana abierta:
      // SOLO focus + postMessage

      for (const client of allClients) {

        try {


          const clientUrl =
            new URL(client.url);


          if (clientUrl.origin === targetUrl.origin) {


            await client.focus();



            // Le enviamos la acción a fotos.html

            client.postMessage({

              type: "DECOM_PUSH_OPEN",

              url: targetUrl.href,

            });



            return;

          }


        } catch (e) {}

      }



      // ✅ Si NO hay ventana:
      // abre directamente fotos.html


      const openParam =
        encodeURIComponent(
          targetUrl.href
        );


      const openUrl =
        new URL(
          `fotos.html?open=${openParam}`,
          self.registration.scope
        ).href;



      await self.clients.openWindow(
        openUrl
      );


    })()
  );

});
