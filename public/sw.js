// This file is intentionally left mostly empty.
// next-pwa will automatically populate it with the necessary service worker code when building the app.
self.addEventListener('install', function(event) {
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(clients.claim());
}); 