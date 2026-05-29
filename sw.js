const CACHE_NAME = 'savstudio-v2';

self.addEventListener('install', (e) => {
    self.skipWaiting(); // Bekleme, anında yeni versiyona geç
});

self.addEventListener('activate', (e) => {
    // Eski hatalı önbellekleri tamamen temizle
    e.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(keys.map((key) => {
                if (key !== CACHE_NAME) return caches.delete(key);
            }));
        })
    );
});

self.addEventListener('fetch', (e) => {
    // ÖNCE İNTERNET (Taze kod) -> EĞER İNTERNET YOKSA HAFIZA (Cache)
    e.respondWith(
        fetch(e.request).catch(() => caches.match(e.request))
    );
});
