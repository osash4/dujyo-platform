/**
 * Authentication Helper Utilities
 * Handles JWT token expiration and automatic logout
 */

/**
 * Check if a response indicates an authentication error (401)
 * and handle it automatically
 */
export async function handleAuthError(
  response: Response,
  onUnauthorized?: () => void
): Promise<boolean> {
  if (response.status === 401) {
    console.warn('🔒 Authentication failed (401). Token may be expired.');
    
    // Clear token and user data
    localStorage.removeItem('jwt_token');
    localStorage.removeItem('user');
    
    // Call custom handler if provided
    if (onUnauthorized) {
      onUnauthorized();
    } else {
      // Default: redirect to login after a short delay
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    }
    
    return true; // Indicates auth error was handled
  }
  
  return false; // No auth error
}

/**
 * Wrapper for fetch that automatically handles 401 errors
 */
export async function authenticatedFetch(
  url: string,
  options: RequestInit = {},
  onUnauthorized?: () => void
): Promise<Response> {
  const token = localStorage.getItem('jwt_token');
  
  // Add Authorization header if token exists
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  const response = await fetch(url, {
    ...options,
    headers,
  });
  
  // Check for auth errors
  const isAuthError = await handleAuthError(response, onUnauthorized);
  
  if (isAuthError) {
    throw new Error('Authentication failed. Please log in again.');
  }
  
  return response;
}

/**
 * Check if token exists and is valid (basic check)
 */
export function isTokenValid(): boolean {
  const token = localStorage.getItem('jwt_token');
  if (!token) {
    return false;
  }
  
  // Basic check: token should be a non-empty string
  // For a more robust check, you could decode the JWT and check expiration
  return token.length > 0;
}

/**
 * Get token with validation
 */
export function getValidToken(): string | null {
  if (!isTokenValid()) {
    console.warn('⚠️ No valid token found');
    return null;
  }
  
  return localStorage.getItem('jwt_token');
}

/**
 * Get refresh token
 */
export function getRefreshToken(): string | null {
  return localStorage.getItem('refresh_token');
}

/**
 * Store tokens (access and refresh)
 */
export function storeTokens(accessToken: string, refreshToken?: string): void {
  localStorage.setItem('jwt_token', accessToken);
  if (refreshToken) {
    localStorage.setItem('refresh_token', refreshToken);
  }
}

/**
 * Clear all tokens
 */
export function clearTokens(): void {
  localStorage.removeItem('jwt_token');
  localStorage.removeItem('refresh_token');
}

/**
 * Refresh access token using refresh token
 */
export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    console.warn('⚠️ No refresh token found');
    return null;
  }

  try {
    const { getApiBaseUrl } = await import('./apiConfig');
    const apiBaseUrl = getApiBaseUrl();
    
    const response = await fetch(`${apiBaseUrl}/api/v1/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) {
      console.error('❌ Failed to refresh token:', response.status);
      clearTokens();
      return null;
    }

    const data = await response.json();
    if (data.success && data.token) {
      // Store new tokens
      storeTokens(data.token, data.refresh_token || refreshToken);
      console.log('✅ Token refreshed successfully');
      return data.token;
    }

    return null;
  } catch (error) {
    console.error('❌ Error refreshing token:', error);
    clearTokens();
    return null;
  }
}

/**
 * Wrapper for fetch that automatically refreshes token on 401
 */
export async function fetchWithAutoRefresh(
  url: string,
  options: RequestInit = {},
  onUnauthorized?: () => void
): Promise<Response> {
  let token = getValidToken();
  
  // Add Authorization header if token exists
  const headers = new Headers(options.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  
  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
    });
  } catch (fetchError) {
    // Network error (CORS, connection failed, etc.)
    console.error('❌ [fetchWithAutoRefresh] Network error:', fetchError);
    throw fetchError;
  }
  
  // If 401, try to refresh token and retry once
  if (response.status === 401) {
    console.log('🔄 Token expired, attempting to refresh...');
    const newToken = await refreshAccessToken();
    
    if (newToken) {
      // Retry request with new token
      headers.set('Authorization', `Bearer ${newToken}`);
      response = await fetch(url, {
        ...options,
        headers,
      });
      
      // If still 401 after refresh, handle auth error
      if (response.status === 401) {
        return handleAuthError(response, onUnauthorized).then(() => response);
      }
    } else {
      // Refresh failed, handle auth error
      return handleAuthError(response, onUnauthorized).then(() => response);
    }
  }
  
  return response;
}

