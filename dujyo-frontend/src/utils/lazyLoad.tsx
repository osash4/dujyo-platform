/**
 * Lazy Loading Utilities
 * 
 * Provides lazy loading helpers for heavy components
 */

import React, { lazy, Suspense, ComponentType } from 'react';
import { motion } from 'framer-motion';

// Loading component for lazy loaded components
export const LazyLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center gap-4"
    >
      <div className="w-12 h-12 border-4 border-purple-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-gray-400">Loading...</p>
    </motion.div>
  </div>
);

// Generic lazy load wrapper
export function lazyLoad<T extends ComponentType<any>>(
  importFunc: () => Promise<{ default: T }>
) {
  return lazy(importFunc);
}

// Lazy loaded components
export const LazyArtistDashboard = lazyLoad(() => import('../components/artist/ArtistDashboard'));
export const LazyArtistAnalytics = lazyLoad(() => import('../components/artist/ArtistAnalytics'));
export const LazyDEXSwap = lazyLoad(() => import('../components/DEX/DEXSwap'));
export const LazyDEXDashboard = lazyLoad(() => import('../components/DEX/DEXDashboard'));
export const LazyVideoPlayer = lazyLoad(() => import('../components/Video/VideoPlayer'));
export const LazyGlobalPlayer = lazyLoad(() => import('../components/Player/GlobalPlayer'));
export const LazyHelpCenter = lazyLoad(() => import('../components/onboarding/HelpCenter'));
export const LazyOnboardingTour = lazyLoad(() => import('../components/onboarding/OnboardingTour'));
export const LazyPaymentDashboard = lazyLoad(() => import('../components/payments/PaymentDashboard'));
export const LazyRoyaltiesManager = lazyLoad(() => import('../components/artist/RoyaltiesManager'));

// Lazy load wrapper with Suspense
export function withLazyLoad<T extends ComponentType<any>>(
  Component: ReturnType<typeof lazyLoad<T>>,
  fallback?: React.ComponentType
) {
  return (props: any) => (
    <Suspense fallback={fallback ? <fallback /> : <LazyLoadingFallback />}>
      <Component {...props} />
    </Suspense>
  );
}

// Intersection Observer hook for lazy loading images
export function useLazyImage(src: string, placeholder?: string) {
  const [imageSrc, setImageSrc] = React.useState(placeholder || '');
  const [isLoaded, setIsLoaded] = React.useState(false);
  const imgRef = React.useRef<HTMLImageElement>(null);

  React.useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const img = new Image();
            img.src = src;
            img.onload = () => {
              setImageSrc(src);
              setIsLoaded(true);
            };
            observer.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [src]);

  return { imageSrc, isLoaded, imgRef };
}

// Dynamic import helper
export async function loadComponent<T>(
  importFunc: () => Promise<{ default: T }>
): Promise<T> {
  const module = await importFunc();
  return module.default;
}

