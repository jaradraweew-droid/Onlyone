// ─── OnlyOne Enhanced Service Worker ────────────────────────────────
// Handles push notifications, notification actions, caching, and
// subscription lifecycle management.

const CACHE_NAME = 'onlyone-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
];

// ─── Install: Precache App Shell ────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

// ─── Activate: Clean Old Caches ─────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// ─── Fetch: Network-First with Cache Fallback ───────────────────────
self.addEventListener('fetch', (event) => {
  // Only cache GET requests for same-origin navigation/assets
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok && event.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, clone));
        }
        return response;
      })
      .catch(() => caches.match(event.request).then((cached) => cached || new Response('Offline', { status: 503 })))
  );
});

// ─── Push: Show Notification ────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = { title: 'OnlyOne', body: 'You have a new notification', icon: '/icons/icon-192.png' };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error('Failed to parse push data:', e);
  }

  const notificationType = data.type || 'general';

  // Group notifications by type using tags
  const tagMap = {
    message: 'onlyone-messages',
    mood: 'onlyone-mood',
    leaf: 'onlyone-leaf',
    pet: 'onlyone-pet',
    general: 'onlyone-general',
  };

  const tag = tagMap[notificationType] || tagMap.general;

  // Build notification actions based on type
  let actions = [];
  if (notificationType === 'message') {
    actions = [
      { action: 'open_chat', title: '💬 Open Chat' },
      { action: 'dismiss', title: 'Dismiss' },
    ];
  } else if (notificationType === 'leaf') {
    actions = [
      { action: 'open_app', title: '🍃 Open' },
    ];
  } else if (notificationType === 'pet') {
    actions = [
      { action: 'open_pet', title: '🐾 Check Pet' },
    ];
  }

  // Determine if we should use silent mode (custom sound will be played client-side)
  const useCustomSound = data.soundMode === 'custom';

  const options = {
    body: data.body,
    icon: data.icon || '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: tag,
    renotify: true,
    vibrate: [100, 50, 100, 50, 200],
    actions: actions,
    data: {
      type: notificationType,
      soundId: data.soundId || null,
      soundMode: data.soundMode || 'default',
      url: data.url || '/',
    },
    // If custom sound mode, set silent so we can play our own sound client-side
    silent: useCustomSound,
  };

  event.waitUntil(
    self.registration.showNotification(data.title, options)
  );

  // If custom sound, notify the active client to play the sound
  if (useCustomSound && data.soundId) {
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND',
            soundId: data.soundId,
          });
        });
      })
    );
  }
});

// ─── Notification Click: Route to Appropriate Screen ────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};
  let targetUrl = '/';

  if (action === 'open_chat' || notifData.type === 'message') {
    targetUrl = '/?tab=chat';
  } else if (action === 'open_pet' || notifData.type === 'pet') {
    targetUrl = '/?tab=pet';
  } else if (action === 'dismiss') {
    return; // Just close
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Focus existing window if available
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          client.postMessage({ type: 'NAVIGATE', url: targetUrl });
          return;
        }
      }
      // Otherwise open new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// ─── Push Subscription Change: Auto Re-subscribe ────────────────────
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.registration.pushManager.subscribe(event.oldSubscription.options).then((newSubscription) => {
      // Re-register with the server
      return fetch('/api/subscribe', {
        method: 'POST',
        body: JSON.stringify({ subscription: newSubscription }),
        headers: { 'content-type': 'application/json' },
      });
    })
  );
});
