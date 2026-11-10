// Minimal service worker used only to show medication reminder notifications.
// Android Chrome does not allow `new Notification()` from a page; it requires
// ServiceWorkerRegistration.showNotification(). No caching or push is done here.

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      const existing = clients.find((client) => 'focus' in client)
      if (existing) return existing.focus()
      return self.clients.openWindow('/medications')
    }),
  )
})
