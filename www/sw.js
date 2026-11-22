/* FartSpace service worker — caches the app shell only.
   Supabase API calls and the Supabase JS CDN are NOT cached here:
   they always go to the network, so the feed stays live. */
var CACHE = 'fartspace-v9';
var SHELL = [
  '/',
 '/index.html', '/admin.html',
  '/config.js', '/app.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png', '/icons/icon-512.png',
  '/hero-animated.mp4',
  '/images/hero.jpg',
  '/images/scene-classic.jpg', '/images/scene-long.jpg',
  '/images/scene-wet.jpg', '/images/scene-squeaky.jpg',
  '/images/scene-deep.jpg', '/images/scene-blast.jpg',
  '/sounds/fart-classic.mp3', '/sounds/fart-long.mp3',
  '/sounds/fart-wet.mp3', '/sounds/fart-squeaky.mp3',
  '/sounds/fart-deep.mp3', '/sounds/fart-blast.mp3'
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) { return cache.addAll(SHELL); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  var req = event.request;
  // Only handle same-origin GETs (the app shell). Everything else
  // (Supabase API, jsDelivr CDN) goes straight to the network.
  if (req.method !== 'GET') return;
  if (new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then(function (cached) {
      var network = fetch(req).then(function (res) {
        if (res && res.ok) {
          var copy = res.clone();
          caches.open(CACHE).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      }).catch(function () { return cached; });
      // Navigations: network first, fall back to cache offline.
      // Other shell files: serve cache immediately, refresh in background.
      // app.js is ALWAYS network-first: it holds the sound code, and a
      // stale cached copy is exactly how a sound fix "doesn't work".
      if (req.mode === 'navigate') return network.catch(function () { return cached; });
      if (req.url.indexOf('/app.js') !== -1) return network.catch(function () { return cached; });
      return cached || network;
    })
  );
});
