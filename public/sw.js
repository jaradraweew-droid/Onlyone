// ─── OnlyOne Service Worker ─────────────────────────────────────────
// Handles push notifications, notification actions, and click routing.
// Kept minimal and robust — no precaching to avoid install failures.

const SW_VERSION = 'onlyone-sw-v2';

// ─── Install: Skip Waiting (instant activation) ────────────────────
self.addEventListener('install', () => {
  self.skipWaiting();
});

// ─── Activate: Claim Clients ────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ─── Push: Show Notification ────────────────────────────────────────
self.addEventListener('push', (event) => {
  let data = {
    title: 'OnlyOne',
    body: 'You have a new notification',
  };

  try {
    if (event.data) {
      data = { ...data, ...event.data.json() };
    }
  } catch (e) {
    console.error('SW: Failed to parse push data:', e);
  }

  const notificationType = data.type || 'general';

  // Group notifications by type using tags
  const tagMap = {
    messages: 'onlyone-messages',
    mood: 'onlyone-mood',
    leaf: 'onlyone-leaf',
    pet: 'onlyone-pet',
    general: 'onlyone-general',
  };

  const tag = tagMap[notificationType] || tagMap.general;

  // Build notification actions based on type
  let actions = [];
  if (notificationType === 'messages') {
    actions = [
      { action: 'open_chat', title: '💬 Open Chat' },
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

  // Custom sound: set silent so client-side can play our synthesized sound
  const useCustomSound = data.soundMode === 'custom';

  const options = {
    body: data.body,
    icon: data.icon || undefined,
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
    silent: useCustomSound,
  };

  const showPromise = self.registration.showNotification(data.title, options);

  // If custom sound, notify client windows to play the synthesized sound
  const soundPromise = (useCustomSound && data.soundId)
    ? self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
        clients.forEach((client) => {
          client.postMessage({
            type: 'PLAY_NOTIFICATION_SOUND',
            soundId: data.soundId,
          });
        });
      })
    : Promise.resolve();

  event.waitUntil(Promise.all([showPromise, soundPromise]));
});

// ─── Notification Click: Route to Appropriate Screen ────────────────
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const action = event.action;
  const notifData = event.notification.data || {};

  // "Dismiss" action — just close
  if (action === 'dismiss') return;

  let targetUrl = '/';
  if (action === 'open_chat' || notifData.type === 'messages') {
    targetUrl = '/?tab=chat';
  } else if (action === 'open_pet' || notifData.type === 'pet') {
    targetUrl = '/?tab=pet';
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
  if (!event.oldSubscription || !event.oldSubscription.options) return;
  event.waitUntil(
    self.registration.pushManager
      .subscribe(event.oldSubscription.options)
      .then((newSub) =>
        fetch('/api/subscribe', {
          method: 'POST',
          body: JSON.stringify({ subscription: newSub }),
          headers: { 'content-type': 'application/json' },
        })
      )
      .catch((err) => console.error('SW: Re-subscribe failed:', err))
  );
});
