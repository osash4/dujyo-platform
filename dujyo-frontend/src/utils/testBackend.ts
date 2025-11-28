/**
 * Utility to test backend connection with better error handling
 */

export async function testBackendConnection(): Promise<{
  success: boolean;
  data?: any;
  error?: string;
  timeMs?: number;
}> {
  const startTime = Date.now();
  
  try {
    console.error('🧪 Testing backend connection...');
    console.error('🌐 URL: https://dujyo-platform.onrender.com/health');
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
    
    const response = await fetch('https://dujyo-platform.onrender.com/health', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const timeMs = Date.now() - startTime;
    console.error(`⏱️ Response time: ${timeMs}ms`);
    console.error(`📊 Status: ${response.status} ${response.statusText}`);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('❌ Response not OK:', text);
      return {
        success: false,
        error: `HTTP ${response.status}: ${response.statusText}`,
        timeMs,
      };
    }
    
    const data = await response.json();
    console.error('✅ Backend connection successful:', data);
    
    return {
      success: true,
      data,
      timeMs,
    };
  } catch (error: any) {
    const timeMs = Date.now() - startTime;
    console.error('❌ Backend connection failed:', error);
    
    let errorMessage = 'Unknown error';
    if (error.name === 'AbortError') {
      errorMessage = 'Request timeout (backend may be sleeping or slow)';
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    return {
      success: false,
      error: errorMessage,
      timeMs,
    };
  }
}

// Make it available globally for console testing
if (typeof window !== 'undefined') {
  (window as any).testBackend = testBackendConnection;
}

