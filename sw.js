// =====================================
// 🚀 SERVICE WORKER DE DECOM
// =====================================

const CACHE_IMAGENES = "anuncios-imagenes-v1";

// Máximo de imágenes guardadas (al pasarse se borran las más antiguas).
// 600 imágenes ≈ 100–150 MB con las fotos comprimidas que sube la app.
const MAX_IMAGENES = 600;

// Dentro de la APK (WebView) la caché de imágenes la maneja la propia app Android,
// así no se guarda dos veces la misma imagen.
const ES_WEBVIEW_APK = /;\s*wv\)/.test((self.navigator && self.navigator.userAgent) || "");


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


            const cacheNames = await caches.keys();


            await Promise.all(

                cacheNames.map(cache => {


                    // ⚠️ Conservamos imágenes de anuncios

                    if(cache === CACHE_IMAGENES){

                        return;

                    }


                    return caches.delete(cache);


                })

            );


        })()

    );

});




// =====================================
// 🖼️ CACHE INTELIGENTE DE IMÁGENES
// =====================================

// Borra las imágenes más antiguas cuando se supera el máximo.
async function recortarCache(cache){

    try{

        const keys = await cache.keys();

        if(keys.length <= MAX_IMAGENES){

            return;

        }

        const sobran = keys.length - Math.floor(MAX_IMAGENES * 0.85);

        for(let i = 0; i < sobran; i++){

            await cache.delete(keys[i]);

        }

    }catch(e){}

}


// Descarga la imagen (con CORS, para poder guardarla) y la guarda en la caché.
async function descargarYGuardar(cache, url, requestOriginal){

    try{

        const response = await fetch(url, {

            mode: "cors",

            credentials: "omit"

        });


        if(response && response.status === 200){

            cache.put(url, response.clone())

                .then(() => recortarCache(cache))

                .catch(() => {});

        }


        return response;

    }catch(e){

        // Si falla la descarga con CORS, se intenta la petición original sin guardarla.

        try{

            return await fetch(requestOriginal);

        }catch(e2){

            return Response.error();

        }

    }

}


async function responderImagen(event){

    const request = event.request;

    const url = request.url;

    const cache = await caches.open(CACHE_IMAGENES);

    const cached = await cache.match(url);


    if(cached){

        // Fotos de perfil sin ?v= pueden cambiar con el mismo nombre:
        // se muestra la guardada y se actualiza en segundo plano.

        const perfilSinVersion =

            url.includes("/object/public/perfiles/") &&

            !/[?&]v=/.test(url);


        if(perfilSinVersion){

            event.waitUntil(descargarYGuardar(cache, url, request).catch(() => {}));

        }


        return cached;

    }


    return descargarYGuardar(cache, url, request);

}


self.addEventListener("fetch", (event)=>{


    const request = event.request;


    const url = request.url;


    if(request.method !== "GET"){

        return;

    }


    // En la APK la caché de imágenes la hace la app Android.

    if(ES_WEBVIEW_APK){

        return;

    }


    // Solo imágenes provenientes de Supabase Storage

    if(

        request.destination === "image" &&

        url.includes("supabase.co/storage")

    ){

        event.respondWith(responderImagen(event));

    }


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



    const rawUrl = data.url || "/fotos.html";



    const targetUrl = new URL(

        rawUrl,

        self.registration.scope

    ).href;




    const options = {


        body: data.body || "",


        icon: data.icon || "/icon-192.png",


        badge: data.badge || "/icon-192.png",



        data: {

            url: targetUrl

        }



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

self.addEventListener("notificationclick", (event)=>{


    event.notification.close();



    const raw =

        (

            event.notification.data &&

            event.notification.data.url

        )

        || "/fotos.html";




    const targetUrl = new URL(

        raw,

        self.location.origin

    );




    event.waitUntil(

        (async()=>{


            const allClients =

                await self.clients.matchAll({

                    type:"window",

                    includeUncontrolled:true

                });





            for(const client of allClients){


                try{


                    const clientUrl =

                        new URL(client.url);



                    if(

                        clientUrl.origin === targetUrl.origin

                    ){


                        await client.focus();



                        client.postMessage({


                            type:"DECOM_PUSH_OPEN",


                            url:targetUrl.href


                        });



                        return;


                    }



                }catch(e){}



            }





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
