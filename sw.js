/**
 * PANDEMONIUM RADIO — SERVICE WORKER (PWA)
 * Estrategia de caché para recursos estáticos con exclusión estricta
 * del flujo de streaming de audio y del archivo dinámico news.json.
 */

const CACHE_NAME = "pandemonium-v4";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/filter.js",
  "./js/daily-notice.js",
  "./js/player_buttons.js",
  "./images/logo-pandemonium.png",
  "./images/vinyl-record.jpg",
  "./images/placeholder.jpg",
  "./manifest.json"
];

// Instalación: Precarga de activos fundamentales
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Purga de cachés antiguas obsoletas
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Intercepción de Red: Network-First con fallback a Caché
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // REGLA CRÍTICA: NUNCA cachear el stream de audio ni las noticias dinámicas
  if (url.includes("stream.zeno.fm") || url.includes("news.json") || event.request.method !== "GET") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === "basic") {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            return cachedResponse;
          }
          if (event.request.mode === "navigate") {
            return caches.match("./index.html");
          }
        });
      })
  );
});
