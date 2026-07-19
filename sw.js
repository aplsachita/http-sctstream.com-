// Service worker: permite "Instalar app" y ahorra datos en visitas repetidas.
//
// Estrategia:
// - index.html, manifest.json: siempre de la red (para que veas los
//   cambios nuevos de la tienda al instante, nunca una versión vieja).
// - Librerías externas (Tailwind, Font Awesome, Firebase SDK) e íconos:
//   se guardan en caché la primera vez y se reusan después, así en la
//   segunda visita casi no se gasta internet en volver a bajarlas.

const CACHE_ESTATICO = 'sct-estatico-v1';

const DOMINIOS_CACHEABLES = [
    'cdn.tailwindcss.com',
    'cdnjs.cloudflare.com',
    'www.gstatic.com',
    'fonts.gstatic.com',
    'fonts.googleapis.com'
];

self.addEventListener('install', (event) => {
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then(nombres =>
            Promise.all(nombres.filter(n => n !== CACHE_ESTATICO).map(n => caches.delete(n)))
        )
    );
    self.clients.claim();
});

self.addEventListener('fetch', (event) => {
    const url = new URL(event.request.url);

    // Los íconos propios de la tienda: caché primero, con respaldo a la red.
    const esIconoLocal = url.origin === self.location.origin && /icon-\d+/.test(url.pathname);

    // Librerías de terceros que casi nunca cambian: caché primero.
    if (DOMINIOS_CACHEABLES.includes(url.hostname) || esIconoLocal) {
        event.respondWith(
            caches.open(CACHE_ESTATICO).then(cache =>
                cache.match(event.request).then(respuestaCache => {
                    if (respuestaCache) return respuestaCache;
                    return fetch(event.request).then(respuestaRed => {
                        cache.put(event.request, respuestaRed.clone());
                        return respuestaRed;
                    }).catch(() => respuestaCache);
                })
            )
        );
        return;
    }

    // Todo lo demás (index.html, Firestore, imágenes de productos, etc.)
    // directo a la red, para que siempre veas lo último.
    event.respondWith(fetch(event.request));
});
