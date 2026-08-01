// =====================================
// 🚀 SERVICE WORKER DE DECOM
// =====================================


const CACHE_IMAGENES = "anuncios-imagenes-v1";


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

self.addEventListener("fetch", (event)=>{


    const request = event.request;


    const url = request.url;



    // Solo imágenes provenientes de Supabase Storage

    if(

        request.destination === "image" &&

        url.includes("supabase.co/storage")

    ){


        event.respondWith(

            caches.open(CACHE_IMAGENES)

            .then(async(cache)=>{


                // Buscar primero en caché

                const cached = await cache.match(request);



                if(cached){

                    return cached;

                }



                // Si no existe, pedir a internet

                const response = await fetch(request);



                // Guardar copia

                if(

                    response &&

                    response.status === 200

                ){

                    cache.put(

                        request,

                        response.clone()

                    );

                }



                return response;



            })

        );


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
