/**
 * Service Worker for ManaSarathi PWA
 * Provides offline capability and caching strategies
 */

const CACHE_NAME = 'ManaSarathi-v1.0.5';
const API_CACHE_NAME = 'ManaSarathi-api-v1.0.5';

// Assets to cache on install
const STATIC_ASSETS = [
  '/index.html',
  '/favicon.svg',
  '/manifest.json',
];

// API endpoints to cache
const CACHEABLE_API_ROUTES = [
  '/api/users/me',
  '/api/assessments/definitions',
  '/api/plans/modules',
  '/api/dashboard/summary',
  '/api/dashboard/insights',
  '/api/dashboard/weekly-progress',
  '/api/dashboard/community-insights',
  '/api/checkins/summary',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[ServiceWorker] Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    }).then(() => {
      console.log('[ServiceWorker] Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== API_CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('[ServiceWorker] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Ignore unsupported schemes (e.g., chrome-extension://) to avoid Cache API runtime errors.
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // API requests - Network First, fallback to cache
  if (url.pathname.startsWith('/api/')) {
    if (!isCacheableApiRoute(url.pathname)) {
      return;
    }

    event.respondWith(
      networkFirstStrategy(request, API_CACHE_NAME)
    );
    return;
  }

  // Never cache HTML/document requests; always go to network first to avoid stale bundles.
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(fetch(request));
    return;
  }

  // Static assets - Cache First, fallback to network
  event.respondWith(
    cacheFirstStrategy(request, CACHE_NAME)
  );
});

/**
 * Cache First Strategy
 * Good for static assets that don't change often
 */
async function cacheFirstStrategy(request, cacheName) {
  if (!isCacheableRequest(request)) {
    return fetch(request);
  }

  try {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[ServiceWorker] Serving from cache:', request.url);
      return cachedResponse;
    }

    console.log('[ServiceWorker] Fetching from network:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[ServiceWorker] Fetch failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    
    throw error;
  }
}

/**
 * Network First Strategy
 * Good for API requests where fresh data is important
 */
async function networkFirstStrategy(request, cacheName) {
  if (!isCacheableRequest(request)) {
    return fetch(request);
  }

  try {
    console.log('[ServiceWorker] Fetching API from network:', request.url);
    const networkResponse = await fetch(request);

    // Cache successful responses
    const cacheControl = networkResponse.headers.get('cache-control') || '';
    if (networkResponse && networkResponse.status === 200 && !cacheControl.includes('no-store')) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache:', request.url);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      console.log('[ServiceWorker] Serving stale API data from cache');
      return cachedResponse;
    }

    console.error('[ServiceWorker] No cached response available:', error);
    throw error;
  }
}

function isCacheableRequest(request) {
  try {
    const url = new URL(request.url);
    return request.method === 'GET' && (url.protocol === 'http:' || url.protocol === 'https:');
  } catch {
    return false;
  }
}

function isCacheableApiRoute(pathname) {
  return CACHEABLE_API_ROUTES.some((route) => pathname === route || pathname.startsWith(`${route}/`));
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-mood-entries') {
    event.waitUntil(syncMoodEntries());
  }
  
  if (event.tag === 'sync-chat-messages') {
    event.waitUntil(syncChatMessages());
  }
});

async function syncMoodEntries() {
  // Implement mood entry sync logic
  console.log('[ServiceWorker] Syncing mood entries');
}

async function syncChatMessages() {
  // Implement chat message sync logic
  console.log('[ServiceWorker] Syncing chat messages');
}

// Push notifications
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');
  
  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    vibrate: [200, 100, 200],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'open',
        title: 'Open App',
        icon: '/icons/checkmark.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/close.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('ManaSarathi', options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click:', event.action);
  
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Message handler for communication with app
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      })
    );
  }
});
