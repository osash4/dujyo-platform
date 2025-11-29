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

