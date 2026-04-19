/**
 * SERVICE WORKER keuanganKU (VERSI FINAL ABSOLUT + IGNORE SEARCH BUGFIX)
 * Fitur: Cache Splitting, True Stale-While-Revalidate, Safe Offline Fallback, Background Lock, Anti-Bloat.
 */

// =========================================================
// ⚠️ PENTING: GANTI ANGKA INI SETIAP ADA UPDATE DI INDEX.HTML
// =========================================================
const APP_VERSION = '1.01'; // Aku naikkan sedikit karena ada update SW

// Pemisahan Brankas Memori
const CACHE_STATIC = 'keuanganku-static-v' + APP_VERSION;
const CACHE_DYNAMIC = 'keuanganku-dynamic-v' + APP_VERSION;

const staticAssets = [
  'https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
];

const dynamicAssets = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

// 1. INSTALASI & SKIP WAITING
self.addEventListener('install', event => {
  self.skipWaiting(); 
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_STATIC).then(cache => cache.addAll(staticAssets)),
      caches.open(CACHE_DYNAMIC).then(cache => cache.addAll(dynamicAssets))
    ])
  );
});

// 2. AKTIVASI & AUTO-CLEANUP
self.addEventListener('activate', event => {
  self.clients.claim(); 
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_STATIC && key !== CACHE_DYNAMIC) {
            console.log('[Service Worker] Menghapus Cache Lama:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
});

// 3. SMART FETCHING & ROUTING
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // A. JALUR EVAKUASI SW.JS (Tidak Boleh Masuk Cache)
  if (requestUrl.pathname.endsWith('sw.js')) return;

  // B. JALUR KHUSUS GOOGLE SHEETS
  if (requestUrl.hostname === 'script.google.com') {
    event.respondWith(fetch(event.request));
    return;
  }

  // C. BRANKAS STATIS (Cache First untuk Library & Font)
  if (staticAssets.some(url => event.request.url.includes(url)) || requestUrl.hostname === 'fonts.gstatic.com') {
    event.respondWith(
      // PENAMBAHAN IGNORE SEARCH PADA ASET STATIS
      caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
        return cachedResponse || fetch(event.request).then(networkResponse => {
          if (networkResponse && (networkResponse.status === 200 || networkResponse.status === 0)) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_STATIC).then(cache => cache.put(event.request, responseToCache));
          }
          return networkResponse;
        });
      })
    );
    return;
  }

  // D. BRANKAS DINAMIS (True Stale-While-Revalidate)
  event.respondWith(
    // PENAMBAHAN IGNORE SEARCH PADA FILE APLIKASI (Anti-Bloat & Kecepatan Instan)
    caches.match(event.request, { ignoreSearch: true }).then(cachedResponse => {
      
      const networkFetch = fetch(event.request).then(networkResponse => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_DYNAMIC).then(cache => {
            // Simpan file asli tanpa ekor parameter agar memori rapi
            cache.put(event.request.url.split('?')[0], responseToCache);
          });
        }
        return networkResponse;
      }).catch(() => {
        // OFFLINE FALLBACK AMAN
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html', { ignoreSearch: true });
        }
      });

      // KUNCI BACKGROUND PROCESS
      if (cachedResponse) {
        event.waitUntil(networkFetch); 
        return cachedResponse; 
      }

      return networkFetch; 
    })
  );
});
