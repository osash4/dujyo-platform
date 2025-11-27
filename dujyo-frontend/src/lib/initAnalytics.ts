/**
 * Initialize Analytics
 * 
 * Call this in App.tsx to initialize all analytics tools
 */

import { initAnalytics } from './analytics';

/**
 * Initialize all analytics on app load
 */
export function initializeAnalytics() {
  if (typeof window === 'undefined') return;

  // Initialize all analytics tools
  initAnalytics();

  // Track initial page load
  console.log('Analytics initialized');
}

