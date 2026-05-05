// Service Worker — Frontino Inversión Municipal
const CACHE = 'frontino-v1';
const ASSETS = [
  '/municipio-inversiones/mobile.html',
  '/municipio-inversiones/manifest.json',
  '/municipio-inversiones/js/data.js',
  '/municipio-inversiones/js/catalogo_dnp.js',
  '/municipio-inversiones/js/mobile.js',
  '/municipio-inversiones/img/escudo.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap',
  'https://unpkg.com/react@18/umd/react.production.min.js',
  'https://unpkg.com/react-dom@18/umd/react-dom.production.min.js',
  'https://unpkg.com/prop-types@15.8.1/prop-types.min.js',
  'https://unpkg.com/recharts@2.9.0/umd/Recharts.js',
  'https://unpkg.com/@babel/standalone@7.23.10/babel.min.js',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled(ASSETS.map(url => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  e.respondWith(
    caches.match(e.request).then(cached => cached || fetch(e.request).catch(() => cached))
  );
});
