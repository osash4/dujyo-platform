//! Frontend Performance Optimization Utilities for Dujyo
//! 
//! This module provides comprehensive frontend optimization:
//! - Code splitting and lazy loading
//! - Image optimization (webp, lazy load)
//! - Bundle size reduction
//! - Service worker for offline support
//! - LocalStorage for cache
//! - Performance monitoring

import { lazy, Suspense, ComponentType } from 'react';

// ===========================================
// CODE SPLITTING & LAZY LOADING
// ===========================================

/**
 * Create a lazy-loaded component with error boundary
 */
export function createLazyComponent<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>,
  fallback?: React.ReactNode
) {
  const LazyComponent = lazy(importFunc);
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense fallback={fallback || <div className="loading-spinner">Loading...</div>}>
        <LazyComponent {...props} />
      </Suspense>
    );
  };
}

/**
 * Lazy load components for different routes
 */
export const LazyComponents = {
  // Main pages
  HomePage: createLazyComponent(() => import('../pages/HomePage')),
  MusicPage: createLazyComponent(() => import('../pages/HomePage/ProfilePage/MusicPage')),
  VideoPage: createLazyComponent(() => import('../pages/VideoPage')),
  GamingPage: createLazyComponent(() => import('../pages/GamingPage')),
  SearchPage: createLazyComponent(() => import('../pages/SearchPage')),
  
  // Artist components
  ArtistDashboard: createLazyComponent(() => import('../components/artist/ArtistDashboard')),
  RoyaltiesManager: createLazyComponent(() => import('../components/artist/RoyaltiesManager')),
  UploadMusic: createLazyComponent(() => import('../components/artist/UploadMusic')),
  VideoManager: createLazyComponent(() => import('../components/artist/VideoManager')),
  GamingManager: createLazyComponent(() => import('../components/artist/GamingManager')),
  CrossPlatformAnalytics: createLazyComponent(() => import('../components/artist/CrossPlatformAnalytics')),
  
  // Blockchain components
  BlockchainInfo: createLazyComponent(() => import('../components/blockchain/BlockchainInfo')),
  TransactionForm: createLazyComponent(() => import('../components/blockchain/TransactionForm')),
  BlockchainView: createLazyComponent(() => import('../components/blockchain/BlockchainView')),
  ValidatorForm: createLazyComponent(() => import('../components/blockchain/ValidatorForm')),
  
  // DEX components
  DEXPage: createLazyComponent(() => import('../pages/DEXPage')),
  DEXDashboard: createLazyComponent(() => import('../components/DEX/DEXDashboard')),
  
  // Admin components
  AdminPage: createLazyComponent(() => import('../pages/AdminPage')),
  AdminUsersPage: createLazyComponent(() => import('../pages/AdminUsersPage')),
  AdminContentPage: createLazyComponent(() => import('../pages/AdminContentPage')),
  AdminBlockchainPage: createLazyComponent(() => import('../pages/AdminBlockchainPage')),
  AdminAnalyticsPage: createLazyComponent(() => import('../pages/AdminAnalyticsPage')),
  
  // Other pages
  StakingPage: createLazyComponent(() => import('../pages/StakingPage')),
  UploadPage: createLazyComponent(() => import('../pages/UploadPage')),
  ValidatorPage: createLazyComponent(() => import('../pages/ValidatorPage')),
  ValidatorRewardsPage: createLazyComponent(() => import('../pages/ValidatorRewardsPage')),
  ValidatorStatsPage: createLazyComponent(() => import('../pages/ValidatorStatsPage')),
  SettingsPage: createLazyComponent(() => import('../pages/SettingsPage')),
};

// ===========================================
// IMAGE OPTIMIZATION
// ===========================================

/**
 * Optimized image component with lazy loading and WebP support
 */
interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: string;
  loading?: 'lazy' | 'eager';
  quality?: number;
}

export function OptimizedImage({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder,
  loading = 'lazy',
  quality = 80
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || src);
  const [isLoaded, setIsLoaded] = React.useState(false);
  const [hasError, setHasError] = React.useState(false);

  // Convert to WebP if supported
  const getOptimizedSrc = (originalSrc: string) => {
    if (typeof window !== 'undefined' && window.Modernizr?.webp) {
      // If WebP is supported, try to use WebP version
      const webpSrc = originalSrc.replace(/\.(jpg|jpeg|png)$/i, '.webp');
      return webpSrc;
    }
    return originalSrc;
  };

  const handleLoad = () => {
    setIsLoaded(true);
    setImageSrc(getOptimizedSrc(src));
  };

  const handleError = () => {
    setHasError(true);
    setImageSrc(src); // Fallback to original
  };

  return (
    <div className={`optimized-image-container ${className}`}>
      {!isLoaded && placeholder && (
        <img
          src={placeholder}
          alt=""
          className="image-placeholder"
          style={{ filter: 'blur(5px)' }}
        />
      )}
      <img
        src={imageSrc}
        alt={alt}
        width={width}
        height={height}
        loading={loading}
        onLoad={handleLoad}
        onError={handleError}
        className={`optimized-image ${isLoaded ? 'loaded' : 'loading'} ${hasError ? 'error' : ''}`}
        style={{
          opacity: isLoaded ? 1 : 0,
          transition: 'opacity 0.3s ease-in-out'
        }}
      />
    </div>
  );
}

// ===========================================
// BUNDLE SIZE OPTIMIZATION
// ===========================================

/**
 * Dynamic import utility for reducing bundle size
 */
export async function dynamicImport<T>(modulePath: string): Promise<T> {
  try {
    const module = await import(/* webpackChunkName: "[request]" */ modulePath);
    return module.default || module;
  } catch (error) {
    console.error(`Failed to load module: ${modulePath}`, error);
    throw error;
  }
}

/**
 * Preload critical resources
 */
export function preloadCriticalResources() {
  if (typeof window === 'undefined') return;

  const criticalResources = [
    '/fonts/inter-var.woff2',
    '/assets/brand/dujyo-logo-full-color-transparente.svg',
    '/images/hero-bg.webp',
  ];

  criticalResources.forEach(resource => {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = resource;
    link.as = resource.endsWith('.woff2') ? 'font' : 'image';
    if (resource.endsWith('.woff2')) {
      link.crossOrigin = 'anonymous';
    }
    document.head.appendChild(link);
  });
}

// ===========================================
// SERVICE WORKER FOR OFFLINE SUPPORT
// ===========================================

/**
 * Register service worker for offline support
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered:', registration);
      
      // Handle updates
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New content is available, show update notification
              showUpdateNotification();
            }
          });
        }
      });
    } catch (error) {
      console.error('Service Worker registration failed:', error);
    }
  }
}

/**
 * Show update notification
 */
function showUpdateNotification() {
  if (confirm('New version available! Reload to update?')) {
    window.location.reload();
  }
}

// ===========================================
// LOCALSTORAGE CACHE
// ===========================================

interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

/**
 * LocalStorage cache with TTL support
 */
export class LocalStorageCache {
  private prefix: string;

  constructor(prefix: string = 'dujyo_cache_') {
    this.prefix = prefix;
  }

  /**
   * Set cache item with TTL
   */
  set<T>(key: string, data: T, ttl: number = 3600000): void { // 1 hour default
    try {
      const item: CacheItem<T> = {
        data,
        timestamp: Date.now(),
        ttl
      };
      localStorage.setItem(this.prefix + key, JSON.stringify(item));
    } catch (error) {
      console.warn('Failed to set cache item:', error);
    }
  }

  /**
   * Get cache item
   */
  get<T>(key: string): T | null {
    try {
      const itemStr = localStorage.getItem(this.prefix + key);
      if (!itemStr) return null;

      const item: CacheItem<T> = JSON.parse(itemStr);
      
      // Check if expired
      if (Date.now() - item.timestamp > item.ttl) {
        this.delete(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Failed to get cache item:', error);
      return null;
    }
  }

  /**
   * Delete cache item
   */
  delete(key: string): void {
    try {
      localStorage.removeItem(this.prefix + key);
    } catch (error) {
      console.warn('Failed to delete cache item:', error);
    }
  }

  /**
   * Clear all cache items
   */
  clear(): void {
    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          localStorage.removeItem(key);
        }
      });
    } catch (error) {
      console.warn('Failed to clear cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalItems: number; totalSize: number; expiredItems: number } {
    let totalItems = 0;
    let totalSize = 0;
    let expiredItems = 0;

    try {
      const keys = Object.keys(localStorage);
      keys.forEach(key => {
        if (key.startsWith(this.prefix)) {
          totalItems++;
          const itemStr = localStorage.getItem(key);
          if (itemStr) {
            totalSize += itemStr.length;
            
            try {
              const item: CacheItem<any> = JSON.parse(itemStr);
              if (Date.now() - item.timestamp > item.ttl) {
                expiredItems++;
              }
            } catch {
              // Invalid item, count as expired
              expiredItems++;
            }
          }
        }
      });
    } catch (error) {
      console.warn('Failed to get cache stats:', error);
    }

    return { totalItems, totalSize, expiredItems };
  }
}

// Global cache instance
export const cache = new LocalStorageCache();

// ===========================================
// PERFORMANCE MONITORING
// ===========================================

interface PerformanceMetrics {
  pageLoadTime: number;
  firstContentfulPaint: number;
  largestContentfulPaint: number;
  firstInputDelay: number;
  cumulativeLayoutShift: number;
  bundleSize: number;
  cacheHitRate: number;
}

/**
 * Performance monitoring utility
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private observers: PerformanceObserver[] = [];

  constructor() {
    this.metrics = {
      pageLoadTime: 0,
      firstContentfulPaint: 0,
      largestContentfulPaint: 0,
      firstInputDelay: 0,
      cumulativeLayoutShift: 0,
      bundleSize: 0,
      cacheHitRate: 0
    };

    this.initializeObservers();
  }

  /**
   * Initialize performance observers
   */
  private initializeObservers() {
    if (typeof window === 'undefined') return;

    // First Contentful Paint
    if ('PerformanceObserver' in window) {
      const fcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const fcpEntry = entries.find(entry => entry.name === 'first-contentful-paint');
        if (fcpEntry) {
          this.metrics.firstContentfulPaint = fcpEntry.startTime;
        }
      });
      fcpObserver.observe({ entryTypes: ['paint'] });
      this.observers.push(fcpObserver);

      // Largest Contentful Paint
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        if (lastEntry) {
          this.metrics.largestContentfulPaint = lastEntry.startTime;
        }
      });
      lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
      this.observers.push(lcpObserver);

      // First Input Delay
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (entry.processingStart && entry.startTime) {
            this.metrics.firstInputDelay = entry.processingStart - entry.startTime;
          }
        });
      });
      fidObserver.observe({ entryTypes: ['first-input'] });
      this.observers.push(fidObserver);

      // Cumulative Layout Shift
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach(entry => {
          if (!(entry as any).hadRecentInput) {
            this.metrics.cumulativeLayoutShift += (entry as any).value;
          }
        });
      });
      clsObserver.observe({ entryTypes: ['layout-shift'] });
      this.observers.push(clsObserver);
    }

    // Page load time
    window.addEventListener('load', () => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      if (navigation) {
        this.metrics.pageLoadTime = navigation.loadEventEnd - navigation.fetchStart;
      }
    });
  }

  /**
   * Get current performance metrics
   */
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }

  /**
   * Report performance metrics
   */
  reportMetrics(): void {
    const metrics = this.getMetrics();
    console.log('Performance Metrics:', metrics);
    
    // Send to analytics service
    if (typeof window !== 'undefined' && (window as any).gtag) {
      (window as any).gtag('event', 'performance_metrics', {
        page_load_time: metrics.pageLoadTime,
        first_contentful_paint: metrics.firstContentfulPaint,
        largest_contentful_paint: metrics.largestContentfulPaint,
        first_input_delay: metrics.firstInputDelay,
        cumulative_layout_shift: metrics.cumulativeLayoutShift
      });
    }
  }

  /**
   * Cleanup observers
   */
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Global performance monitor instance
export const performanceMonitor = new PerformanceMonitor();

// ===========================================
// INITIALIZATION
// ===========================================

/**
 * Initialize all performance optimizations
 */
export function initializePerformanceOptimizations() {
  // Preload critical resources
  preloadCriticalResources();
  
  // Register service worker
  registerServiceWorker();
  
  // Start performance monitoring
  if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
      setTimeout(() => {
        performanceMonitor.reportMetrics();
      }, 2000);
    });
  }
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Debounce function for performance
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

/**
 * Throttle function for performance
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
}

/**
 * Check if user prefers reduced motion
 */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Get device type for performance optimization
 */
export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'desktop';
}

/**
 * Check if connection is slow
 */
export function isSlowConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  const connection = (navigator as any).connection;
  if (!connection) return false;
  
  return connection.effectiveType === 'slow-2g' || 
         connection.effectiveType === '2g' ||
         connection.saveData === true;
}

export default {
  createLazyComponent,
  LazyComponents,
  OptimizedImage,
  dynamicImport,
  preloadCriticalResources,
  registerServiceWorker,
  LocalStorageCache,
  cache,
  PerformanceMonitor,
  performanceMonitor,
  initializePerformanceOptimizations,
  debounce,
  throttle,
  prefersReducedMotion,
  getDeviceType,
  isSlowConnection
};
