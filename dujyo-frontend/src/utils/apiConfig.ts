/**
 * API Configuration Utility
 * Automatically detects backend URL based on current environment
 */

/**
 * Get the backend API base URL
 * - In development: uses localhost:8083
 * - When accessed via ngrok: uses relative URLs (Vite proxy handles /api)
 * - In production: uses environment variable or default
 */
export function getApiBaseUrl(): string {
  // Check if we have an environment variable set
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  if (envUrl && !envUrl.includes('ngrok')) {
    return envUrl;
  }

  // Check if we're running in browser
  if (typeof window === 'undefined') {
    return 'http://localhost:8083';
  }

  const currentHost = window.location.hostname;

  // ✅ FIX: Always use localhost in development (ignore ngrok for now)
  // If on localhost, use localhost:8083
  if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost === '') {
    return 'http://localhost:8083';
  }

  // If accessing via ngrok (ngrok.io, ngrok-free.app, ngrok-free.dev)
  if (
    currentHost.includes('ngrok.io') ||
    currentHost.includes('ngrok-free.app') ||
    currentHost.includes('ngrok-free.dev')
  ) {
    // Use relative URLs - Vite proxy will handle /api, /login, /register routes
    // This works because Vite dev server proxies these routes to backend
    // When accessed via ngrok, requests go through Vite server which proxies to backend
    console.log('🌐 Detected ngrok access, using relative URLs (Vite proxy)');
    return '';
  }

  // Default fallback
  return 'http://localhost:8083';
}

/**
 * Get WebSocket URL
 */
export function getWebSocketUrl(): string {
  const apiUrl = getApiBaseUrl();
  
  // If using relative URLs (ngrok), construct WS URL from current location
  if (apiUrl === '') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  // Replace http:// with ws:// or https:// with wss://
  if (apiUrl.startsWith('http://')) {
    return apiUrl.replace('http://', 'ws://') + '/ws';
  }
  if (apiUrl.startsWith('https://')) {
    return apiUrl.replace('https://', 'wss://') + '/ws';
  }

  return 'ws://localhost:8083/ws';
}

// Export the base URL as a constant for convenience
export const API_BASE_URL = getApiBaseUrl();
export const WS_URL = getWebSocketUrl();

