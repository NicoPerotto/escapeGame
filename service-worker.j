const CACHE_NAME = 'puzzle-game-v1';
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/app.js',
    '/manifest.json',
    // Agrega aquí todas las rutas a tus iconos
    '/icons/icon-72x72.png',
    '/icons/icon-96x96.png',
    '/icons/icon-128x128.png',
    '/icons/icon-144x144.png',
    '/icons/icon-152x152.png',
    '/icons/icon-192x192.png',
    '/icons/icon-384x384.png',
    '/icons/icon-512x512.png',
    '/service-worker-registration.js' // Es buena práctica cachear el script de registro también
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Cacheando archivos estáticos...');
                return cache.addAll(urlsToCache);
            })
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Si encontramos una respuesta en la caché, la devolvemos
                if (response) {
                    return response;
                }
                // Si no, intentamos obtenerla de la red
                return fetch(event.request).catch(() => {
                    // Si falla la red y no hay caché, puedes devolver una página offline personalizada
                    // o un mensaje de error. Por ahora, simplemente fallará si no está en caché.
                    console.log('No hay conexión y no está en caché:', event.request.url);
                });
            })
    );
});

self.addEventListener('activate', event => {
    // Elimina cachés antiguas que ya no son necesarias
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Eliminando caché antigua:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});