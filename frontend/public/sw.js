/**
 * Service Worker for Push Notifications
 * Handles push notifications even when the web app is closed
 * Works on mobile browsers
 */

// Service worker version - increment to force update
const SW_VERSION = '1.0.2';

// Listen for push events
self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);

  let data = {
    title: 'Hospital Notification',
    body: 'You have a new notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: {
      url: '/dashboard'
    }
  };

  // Parse notification data
  if (event.data) {
    try {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.notification_type || 'hospital-notification',
        requireInteraction: payload.notification_type === 'emergency_alert',
        vibrate: payload.notification_type === 'emergency_alert' ? [200, 100, 200] : [100],
        data: payload.data || data.data
      };
    } catch (e) {
      console.error('[Service Worker] Failed to parse push data:', e);
    }
  }

  // Show notification
  const promiseChain = self.registration.showNotification(data.title, {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    requireInteraction: data.requireInteraction,
    vibrate: data.vibrate,
    data: data.data
  });

  event.waitUntil(promiseChain);
});

// Listen for notification clicks
self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event.notification.tag);

  event.notification.close();

  // Get the URL to open
  const urlToOpen = event.notification.data?.url || '/dashboard';

  // Open or focus the app
  event.waitUntil(
    clients.matchAll({
      type: 'window',
      includeUncontrolled: true
    })
    .then(function(clientList) {
      // Check if there's already a window open
      for (let i = 0; i < clientList.length; i++) {
        const client = clientList[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus().then(() => client.navigate(urlToOpen));
        }
      }
      // If no window is open, open a new one
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Service worker activation
self.addEventListener('activate', function(event) {
  console.log('[Service Worker] Activated, version:', SW_VERSION);
  event.waitUntil(self.clients.claim());
});

// Service worker installation
self.addEventListener('install', function(event) {
  console.log('[Service Worker] Installing, version:', SW_VERSION);
  self.skipWaiting();
});

// Handle messages from the main thread
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
