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
  // ✅ PRIORITY 1: Check environment variable (for Vercel/production)
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl) {
    // Remove trailing slash if present
    const cleanUrl = envUrl.replace(/\/$/, '');
    console.log('🌐 Using API URL from environment:', cleanUrl);
    return cleanUrl;
  }

  // Check if we're running in browser
  if (typeof window === 'undefined') {
    return 'http://localhost:8083';
  }

  const currentHost = window.location.hostname;

  // ✅ PRIORITY 2: Production domain (dujyo.com)
  if (currentHost === 'dujyo.com' || currentHost === 'www.dujyo.com') {
    // In production, MUST use env var - throw error if not set
    console.error('❌ ERROR: VITE_API_BASE_URL not set in production!');
    console.error('   Please configure VITE_API_BASE_URL in Vercel environment variables');
    console.error('   Expected format: https://tu-backend-render.onrender.com');
    // Fallback: try to construct from common Render pattern (not recommended)
    console.warn('⚠️ Falling back to default Render URL pattern');
    return 'https://dujyo-platform.onrender.com';
  }

  // ✅ PRIORITY 3: Development (localhost)
  if (currentHost === 'localhost' || currentHost === '127.0.0.1' || currentHost === '') {
    return 'http://localhost:8083';
  }

  // ✅ PRIORITY 4: Vercel preview deployments
  if (currentHost.includes('vercel.app')) {
    // Use env var if available, otherwise show error
    if (!envUrl) {
      console.error('❌ ERROR: VITE_API_BASE_URL not set for Vercel preview!');
    }
    return envUrl || 'https://dujyo-platform.onrender.com';
  }

  // ✅ PRIORITY 5: ngrok (development tunneling)
  if (
    currentHost.includes('ngrok.io') ||
    currentHost.includes('ngrok-free.app') ||
    currentHost.includes('ngrok-free.dev')
  ) {
    // Use relative URLs - Vite proxy will handle /api, /login, /register routes
    console.log('🌐 Detected ngrok access, using relative URLs (Vite proxy)');
    return '';
  }

  // Default fallback
  console.warn('⚠️ Using default localhost API URL');
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

