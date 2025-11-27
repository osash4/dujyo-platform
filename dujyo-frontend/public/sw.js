//! Service Worker for Dujyo Frontend
//! 
//! This service worker provides:
//! - Offline support with cache-first strategy
//! - Background sync for failed requests
//! - Push notifications
//! - Cache management
//! - Performance optimization

const CACHE_NAME = 'dujyo-v1';
const STATIC_CACHE_NAME = 'dujyo-static-v1';
const DYNAMIC_CACHE_NAME = 'dujyo-dynamic-v1';
const API_CACHE_NAME = 'dujyo-api-v1';

// Resources to cache immediately
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/favicon.ico',
  '/images/logo.svg',
  '/images/hero-bg.webp',
  '/fonts/inter-var.woff2',
  '/css/main.css',
  '/js/main.js'
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/health',
  '/api/blockchain/info',
  '/api/dex/pools',
  '/api/nft/collections'
];

// Cache strategies
const CACHE_STRATEGIES = {
  // Static assets - cache first
  static: {
    pattern: /\.(css|js|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/,
    strategy: 'cache-first'
  },
  // API endpoints - network first with cache fallback
  api: {
    pattern: /^\/api\//,
    strategy: 'network-first'
  },
  // HTML pages - network first with cache fallback
  html: {
    pattern: /\.html$/,
    strategy: 'network-first'
  },
  // Images - cache first with network fallback
  images: {
    pattern: /\.(png|jpg|jpeg|gif|webp|svg)$/,
    strategy: 'cache-first'
  }
};

// ===========================================
// INSTALL EVENT
// ===========================================

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      }),
      // Cache API endpoints
      caches.open(API_CACHE_NAME).then((cache) => {
        console.log('Service Worker: Caching API endpoints');
        return cache.addAll(API_ENDPOINTS.map(url => new Request(url)));
      })
    ]).then(() => {
      console.log('Service Worker: Installation complete');
      return self.skipWaiting();
    })
  );
});

// ===========================================
// ACTIVATE EVENT
// ===========================================

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && 
                cacheName !== STATIC_CACHE_NAME && 
                cacheName !== DYNAMIC_CACHE_NAME && 
                cacheName !== API_CACHE_NAME) {
              console.log('Service Worker: Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ]).then(() => {
      console.log('Service Worker: Activation complete');
    })
  );
});

// ===========================================
// FETCH EVENT
// ===========================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }
  
  // Skip chrome-extension and other non-http requests
  if (!url.protocol.startsWith('http')) {
    return;
  }
  
  // Determine cache strategy
  const strategy = getCacheStrategy(request);
  
  event.respondWith(
    handleRequest(request, strategy)
  );
});

// ===========================================
// CACHE STRATEGIES
// ===========================================

/**
 * Get cache strategy for a request
 */
function getCacheStrategy(request) {
  const url = request.url;
  
  if (CACHE_STRATEGIES.static.pattern.test(url)) {
    return CACHE_STRATEGIES.static.strategy;
  }
  
  if (CACHE_STRATEGIES.api.pattern.test(url)) {
    return CACHE_STRATEGIES.api.strategy;
  }
  
  if (CACHE_STRATEGIES.html.pattern.test(url)) {
    return CACHE_STRATEGIES.html.strategy;
  }
  
  if (CACHE_STRATEGIES.images.pattern.test(url)) {
    return CACHE_STRATEGIES.images.strategy;
  }
  
  return 'network-first';
}

/**
 * Handle request with appropriate strategy
 */
async function handleRequest(request, strategy) {
  try {
    switch (strategy) {
      case 'cache-first':
        return await cacheFirst(request);
      case 'network-first':
        return await networkFirst(request);
      case 'network-only':
        return await networkOnly(request);
      case 'cache-only':
        return await cacheOnly(request);
      default:
        return await networkFirst(request);
    }
  } catch (error) {
    console.error('Service Worker: Request failed:', error);
    return new Response('Service Worker: Request failed', { status: 500 });
  }
}

/**
 * Cache-first strategy
 */
async function cacheFirst(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.error('Service Worker: Network request failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-first strategy
 */
async function networkFirst(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache:', error);
    
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network-only strategy
 */
async function networkOnly(request) {
  return await fetch(request);
}

/**
 * Cache-only strategy
 */
async function cacheOnly(request) {
  const cachedResponse = await caches.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }
  
  return new Response('Not cached', { status: 404 });
}

// ===========================================
// BACKGROUND SYNC
// ===========================================

self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(doBackgroundSync());
  }
});

/**
 * Perform background sync
 */
async function doBackgroundSync() {
  try {
    // Get failed requests from IndexedDB
    const failedRequests = await getFailedRequests();
    
    for (const requestData of failedRequests) {
      try {
        const response = await fetch(requestData.url, requestData.options);
        
        if (response.ok) {
          // Remove from failed requests
          await removeFailedRequest(requestData.id);
          console.log('Service Worker: Background sync successful for:', requestData.url);
        }
      } catch (error) {
        console.error('Service Worker: Background sync failed for:', requestData.url, error);
      }
    }
  } catch (error) {
    console.error('Service Worker: Background sync error:', error);
  }
}

// ===========================================
// PUSH NOTIFICATIONS
// ===========================================

self.addEventListener('push', (event) => {
  console.log('Service Worker: Push notification received');
  
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/images/icon-192x192.png',
      badge: '/images/badge-72x72.png',
      vibrate: [100, 50, 100],
      data: {
        dateOfArrival: Date.now(),
        primaryKey: data.primaryKey
      },
      actions: [
        {
          action: 'explore',
          title: 'Explore',
          icon: '/images/checkmark.png'
        },
        {
          action: 'close',
          title: 'Close',
          icon: '/images/xmark.png'
        }
      ]
    };
    
    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

// ===========================================
// NOTIFICATION CLICK
// ===========================================

self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/explore')
    );
  } else if (event.action === 'close') {
    // Just close the notification
  } else {
    // Default action - open the app
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// ===========================================
// MESSAGE HANDLING
// ===========================================

self.addEventListener('message', (event) => {
  console.log('Service Worker: Message received:', event.data);
  
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  
  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_NAME });
  }
  
  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  }
});

// ===========================================
// CACHE MANAGEMENT
// ===========================================

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames.map(cacheName => caches.delete(cacheName))
  );
  console.log('Service Worker: All caches cleared');
}

/**
 * Get cache statistics
 */
async function getCacheStats() {
  const cacheNames = await caches.keys();
  const stats = {};
  
  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    stats[cacheName] = keys.length;
  }
  
  return stats;
}

// ===========================================
// INDEXEDDB HELPERS
// ===========================================

/**
 * Get failed requests from IndexedDB
 */
async function getFailedRequests() {
  // This would be implemented with IndexedDB
  // For now, return empty array
  return [];
}

/**
 * Remove failed request from IndexedDB
 */
async function removeFailedRequest(id) {
  // This would be implemented with IndexedDB
  // For now, do nothing
}

// ===========================================
// PERFORMANCE MONITORING
// ===========================================

/**
 * Monitor cache performance
 */
function monitorCachePerformance() {
  setInterval(async () => {
    const stats = await getCacheStats();
    console.log('Service Worker: Cache stats:', stats);
    
    // Send stats to analytics
    if (self.clients) {
      const clients = await self.clients.matchAll();
      clients.forEach(client => {
        client.postMessage({
          type: 'CACHE_STATS',
          stats: stats
        });
      });
    }
  }, 60000); // Every minute
}

// Start performance monitoring
monitorCachePerformance();

// ===========================================
// ERROR HANDLING
// ===========================================

self.addEventListener('error', (event) => {
  console.error('Service Worker: Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('Service Worker: Unhandled promise rejection:', event.reason);
});

console.log('Service Worker: Loaded successfully');
