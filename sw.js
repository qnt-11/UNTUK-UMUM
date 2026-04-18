// Nama cache diperbarui agar memuat versi HTML terbaru
const CACHE_NAME = 'keuanganku-v1.01';

// Daftar file yang akan disimpan di memori HP (Offline Mode)
const urlsToCache = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// Proses Install: Menyimpan file ke dalam Cache
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
        .then(cache => {
            console.log('Cache berhasil dibuka');
            return cache.addAll(urlsToCache);
        })
    );
});

// Proses Activate: Menghapus Cache versi lama agar tidak bentrok
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Menghapus cache lama:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Proses Fetch: Menampilkan file dari Cache saat Offline
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
        .then(response => {
            // Jika file ada di memori, tampilkan. Jika tidak, ambil dari internet.
            return response || fetch(event.request);
        })
    );
});
