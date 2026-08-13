const CACHE_NAME = "pandemonium-v1";
const ASSETS_TO_CACHE = [
  "./",
  "./index.html",
  "./styles.css",
  "./js/filter.js",
  "./js/daily-notice.js",
  "./js/player_buttons.js",
  "./images/logo-pandemonium.png",
  "./images/placeholder.jpg",
  "./manifest.json"
];

// Instalar Service Worker y guardar recursos estaticos en cache
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activar y limpiar caches obsoletas
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

// Interceptar peticiones de red
self.addEventListener("fetch", (event) => {
  const url = event.request.url;

  // Excluir streaming de audio y news.json dinamico de la cache estatica
  if (url.includes("stream.zeno.fm") || url.includes("news.json")) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).catch(() => {
        if (event.request.mode === "navigate") {
          return caches.match("./index.html");
        }
      });
    })
  );
});
