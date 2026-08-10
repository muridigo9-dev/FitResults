// Service Worker for Push Notifications

self.addEventListener("install", (event) => {
  console.log("Service Worker installing...");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Service Worker activated");
  event.waitUntil(clients.claim());
});

// Handle push notifications
self.addEventListener("push", (event) => {
  console.log("Push notification received:", event);

  let data = {
    title: "FitResults",
    body: "Você tem uma nova notificação!",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    data: {},
  };

  if (event.data) {
    try {
      data = { ...data, ...event.data.json() };
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    vibrate: [100, 50, 100],
    data: data.data,
    actions: [
      {
        action: "open",
        title: "Abrir App",
      },
      {
        action: "close",
        title: "Fechar",
      },
    ],
    tag: "fitresults-notification",
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click
self.addEventListener("notificationclick", (event) => {
  console.log("Notification clicked:", event);
  event.notification.close();

  if (event.action === "close") {
    return;
  }

  // Open the app or focus existing window
  event.waitUntil(
    clients
      .matchAll({
        type: "window",
        includeUncontrolled: true,
      })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && "focus" in client) {
            return client.focus();
          }
        }

        // If no window is open, open a new one
        if (clients.openWindow) {
          const url = event.notification.data?.url || "/dashboard";
          return clients.openWindow(url);
        }
      })
  );
});

// Handle background sync for offline check-ins
self.addEventListener("sync", (event) => {
  console.log("Background sync:", event.tag);

  if (event.tag === "sync-checkins") {
    event.waitUntil(syncCheckins());
  }
});

async function syncCheckins() {
  // Placeholder for offline sync logic
  console.log("Syncing offline check-ins...");
}
