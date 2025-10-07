/* =========================================================
   BayarInter Billing Reseller
   Version: service-worker.js (v1)
   Stage: Basic Offline Cache
   ========================================================= */

/**
 * Tujuan file:
 *  - Menyediakan caching dasar untuk akses offline
 *  - Mem-cache file statis (HTML, CSS, JS, logo)
 *  - Belum melakukan background sync atau API caching
 *  - Digunakan bersama manifest.json untuk PWA
 */

const CACHE_NAME = 'bayarinter-cache-v1';
const ASSETS = [
  '/',                        // root
  '/index.html',
  '/static/app.js',
  '/static/db.js',
  '/static/assets/logo.png'
];

// =========================================================
// Install Service Worker
// =========================================================
self.addEventListener('install', event => {
  console.log('📦 Service Worker: Instalasi dimulai (v1)');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      return cache.addAll(ASSETS);
    }).then(() => {
      console.log('✅ Aset telah di-cache');
      return self.skipWaiting();
    })
  );
});

// =========================================================
// Aktivasi & Pembersihan Cache Lama
// =========================================================
self.addEventListener('activate', event => {
  console.log('🚀 Service Worker: Aktif (v1)');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🧹 Menghapus cache lama:', key);
            return caches.delete(key);
          }
        })
      );
    })
  );
  return self.clients.claim();
});

// =========================================================
// Fetch Event: Offline Fallback
// =========================================================
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => {
      // Jika file ada di cache, gunakan
      if (response) {
        return response;
      }
      // Jika tidak ada, ambil dari jaringan
      return fetch(event.request)
        .then(networkResponse => {
          // Simpan file baru ke cache (hanya file GET)
          if (event.request.method === 'GET') {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback — tampilkan halaman dasar
          if (event.request.mode === 'navigate') {
            return caches.match('/index.html');
          }
        });
    })
  );
});
