/**
 * Service Worker for Push Notifications
 * Handles push notification events and notification clicks
 */

self.addEventListener('push', function(event) {
  console.log('[Service Worker] Push received:', event);
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'FOX TRADE MASTER™', body: event.data.text() };
    }
  }
  
  const title = data.title || 'FOX TRADE MASTER™';
  const options = {
    body: data.body || 'New trading signal alert',
    icon: '/logo.svg',
    badge: '/logo.svg',
    data: {
      url: data.url || '/',
      signalId: data.signalId,
      alertType: data.alertType
    },
    tag: data.tag || 'forex-signal',
    requireInteraction: data.requireInteraction || false,
    vibrate: [200, 100, 200]
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', function(event) {
  console.log('[Service Worker] Notification clicked:', event);
  
  event.notification.close();
  
  const urlToOpen = event.notification.data.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then(function(clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // If no window is open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener('notificationclose', function(event) {
  console.log('[Service Worker] Notification closed:', event);
});
