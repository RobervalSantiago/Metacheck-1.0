const CACHE_NAME = 'metacheck-v4-pwa-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json'
];

// Instalação: Cache inicial de arquivos estáticos críticos
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(URLS_TO_CACHE);
      })
      .then(() => self.skipWaiting())
  );
});

// Ativação: Limpeza de caches antigos
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Estratégia Network First (Tenta rede, falha para cache)
// Isso garante dados atualizados quando online, mas funcionamento quando offline
self.addEventListener('fetch', (event) => {
  // Ignora requisições que não sejam GET ou sejam para API do Google/GenAI (pois precisam de validação online)
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Se a resposta for válida, clonamos e atualizamos o cache
        if (!response || response.status !== 200 || response.type !== 'basic' && response.type !== 'cors') {
          return response;
        }

        const responseToCache = response.clone();
        caches.open(CACHE_NAME)
          .then((cache) => {
            // Cache apenas http/https
            if (event.request.url.startsWith('http')) {
                cache.put(event.request, responseToCache);
            }
          });

        return response;
      })
      .catch(() => {
        // Se falhar (offline), tenta retornar do cache
        return caches.match(event.request);
      })
  );
});