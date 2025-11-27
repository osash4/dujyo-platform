/**
 * Analytics Integration
 * 
 * Integrates multiple analytics tools:
 * - Google Analytics
 * - Hotjar (heatmaps, recordings)
 * - Sentry (error tracking)
 * - Custom analytics
 */

// ============================================
// Google Analytics
// ============================================

declare global {
  interface Window {
    gtag?: (...args: any[]) => void;
    dataLayer?: any[];
    hj?: (...args: any[]) => void;
    _hjSettings?: any;
    Sentry?: any;
  }
}

let analyticsInitialized = false;

/**
 * Initialize Google Analytics
 */
export function initGoogleAnalytics(measurementId: string) {
  if (typeof window === 'undefined' || analyticsInitialized) return;

  // Load Google Analytics script
  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
  document.head.appendChild(script1);

  const script2 = document.createElement('script');
  script2.innerHTML = `
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${measurementId}', {
      page_path: window.location.pathname,
    });
  `;
  document.head.appendChild(script2);

  analyticsInitialized = true;
}

/**
 * Track page view
 */
export function trackPageView(path: string, title?: string) {
  if (typeof window === 'undefined') return;

  // Google Analytics
  if (window.gtag) {
    window.gtag('config', process.env.VITE_GA_MEASUREMENT_ID || '', {
      page_path: path,
      page_title: title || document.title,
    });
  }

  // Hotjar
  if (window.hj) {
    window.hj('stateChange', path);
  }

  // Custom analytics
  sendToBackend('page_view', {
    path,
    title: title || document.title,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track event
 */
export function trackEvent(
  eventName: string,
  eventParams?: Record<string, any>
) {
  if (typeof window === 'undefined') return;

  // Google Analytics
  if (window.gtag) {
    window.gtag('event', eventName, eventParams);
  }

  // Hotjar
  if (window.hj) {
    window.hj('event', eventName);
  }

  // Custom analytics
  sendToBackend('event', {
    event_name: eventName,
    ...eventParams,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track user action
 */
export function trackUserAction(
  action: string,
  details?: Record<string, any>
) {
  trackEvent('user_action', {
    action,
    ...details,
  });
}

/**
 * Track feedback
 */
export function trackFeedback(
  feedback: any,
  metadata?: Record<string, any>
) {
  trackEvent('feedback_submitted', {
    feedback_type: feedback.type,
    feedback_rating: feedback.rating,
    feedback_context: feedback.context,
    ...metadata,
  });

  // Send to backend for detailed analysis
  sendToBackend('feedback', {
    ...feedback,
    ...metadata,
  });
}

/**
 * Track error
 */
export function trackError(
  error: Error,
  context?: Record<string, any>
) {
  // Sentry
  if (window.Sentry) {
    window.Sentry.captureException(error, {
      contexts: {
        custom: context,
      },
    });
  }

  // Google Analytics
  trackEvent('exception', {
    description: error.message,
    fatal: false,
    ...context,
  });

  // Custom analytics
  sendToBackend('error', {
    error_message: error.message,
    error_stack: error.stack,
    ...context,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track performance
 */
export function trackPerformance(
  metricName: string,
  value: number,
  unit?: string
) {
  trackEvent('performance', {
    metric_name: metricName,
    value,
    unit: unit || 'ms',
  });

  sendToBackend('performance', {
    metric_name: metricName,
    value,
    unit: unit || 'ms',
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track onboarding progress
 */
export function trackOnboardingStep(
  step: number,
  stepName: string,
  completed: boolean,
  timeSpent?: number
) {
  trackEvent('onboarding_step', {
    step,
    step_name: stepName,
    completed,
    time_spent: timeSpent,
  });

  sendToBackend('onboarding', {
    step,
    step_name: stepName,
    completed,
    time_spent: timeSpent,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track feature usage
 */
export function trackFeatureUsage(
  featureName: string,
  action?: string,
  metadata?: Record<string, any>
) {
  trackEvent('feature_usage', {
    feature_name: featureName,
    action: action || 'used',
    ...metadata,
  });

  sendToBackend('feature_usage', {
    feature_name: featureName,
    action: action || 'used',
    ...metadata,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track abandonment point
 */
export function trackAbandonment(
  page: string,
  reason?: string,
  timeSpent?: number
) {
  trackEvent('abandonment', {
    page,
    reason,
    time_spent: timeSpent,
  });

  sendToBackend('abandonment', {
    page,
    reason,
    time_spent: timeSpent,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Track frustration point
 */
export function trackFrustration(
  page: string,
  element?: string,
  action?: string
) {
  trackEvent('frustration', {
    page,
    element,
    action,
  });

  sendToBackend('frustration', {
    page,
    element,
    action,
    timestamp: new Date().toISOString(),
  });
}

// ============================================
// Hotjar Integration
// ============================================

/**
 * Initialize Hotjar
 */
export function initHotjar(siteId: string) {
  if (typeof window === 'undefined') return;

  (function (h: any, o: any, t: any, j: any, a: any, r: any) {
    h.hj =
      h.hj ||
      function () {
        (h.hj.q = h.hj.q || []).push(arguments);
      };
    h._hjSettings = { hjid: siteId, hjsv: 6 };
    a = o.getElementsByTagName('head')[0];
    r = o.createElement('script');
    r.async = 1;
    r.src = t + h._hjSettings.hjid + j + h._hjSettings.hjsv;
    a.appendChild(r);
  })(window, document, 'https://static.hotjar.com/c/hotjar-', '.js?sv=');

  // Track page view
  if (window.hj) {
    window.hj('stateChange', window.location.pathname);
  }
}

// ============================================
// Sentry Integration
// ============================================

/**
 * Initialize Sentry
 */
export function initSentry(dsn: string, environment?: string) {
  if (typeof window === 'undefined') return;

  // Sentry should be loaded via script tag or npm package
  // This is just the initialization
  if (window.Sentry) {
    window.Sentry.init({
      dsn,
      environment: environment || 'production',
      tracesSampleRate: 1.0,
      beforeSend(event, hint) {
        // Add custom context
        if (event) {
          event.contexts = {
            ...event.contexts,
            custom: {
              url: window.location.href,
              userAgent: navigator.userAgent,
              viewport: {
                width: window.innerWidth,
                height: window.innerHeight,
              },
            },
          };
        }
        return event;
      },
    });
  }
}

/**
 * Set user context for Sentry
 */
export function setSentryUser(userId: string, email?: string, username?: string) {
  if (window.Sentry) {
    window.Sentry.setUser({
      id: userId,
      email,
      username,
    });
  }
}

// ============================================
// Custom Analytics Backend
// ============================================

/**
 * Send analytics data to backend
 */
async function sendToBackend(
  eventType: string,
  data: Record<string, any>
) {
  try {
    await fetch('/api/v1/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event_type: eventType,
        ...data,
      }),
    });
  } catch (error) {
    // Silently fail - analytics should not break the app
    console.error('Failed to send analytics:', error);
  }
}

// ============================================
// Session Tracking
// ============================================

let sessionId: string | null = null;
let sessionStartTime: number = Date.now();

/**
 * Initialize session tracking
 */
export function initSessionTracking() {
  if (typeof window === 'undefined') return;

  // Get or create session ID
  sessionId = sessionStorage.getItem('dujyo_session_id') || generateSessionId();
  sessionStorage.setItem('dujyo_session_id', sessionId);
  sessionStartTime = Date.now();

  // Track session start
  trackEvent('session_start', {
    session_id: sessionId,
  });

  // Track page visibility changes
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      trackEvent('session_pause', {
        session_id: sessionId,
        duration: Date.now() - sessionStartTime,
      });
    } else {
      trackEvent('session_resume', {
        session_id: sessionId,
      });
    }
  });

  // Track before unload
  window.addEventListener('beforeunload', () => {
    trackEvent('session_end', {
      session_id: sessionId,
      duration: Date.now() - sessionStartTime,
    });
  });
}

/**
 * Generate session ID
 */
function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get current session ID
 */
export function getSessionId(): string | null {
  return sessionId;
}

// ============================================
// Performance Monitoring
// ============================================

/**
 * Track page load performance
 */
export function trackPageLoad() {
  if (typeof window === 'undefined' || !window.performance) return;

  const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  
  if (navigation) {
    trackPerformance('page_load_time', navigation.loadEventEnd - navigation.fetchStart);
    trackPerformance('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
    trackPerformance('first_paint', navigation.responseEnd - navigation.fetchStart);
  }

  // Track Web Vitals
  if ('web-vitals' in window) {
    // Web Vitals library would be loaded separately
    // This is a placeholder
  }
}

// ============================================
// Initialization
// ============================================

/**
 * Initialize all analytics
 */
export function initAnalytics() {
  if (typeof window === 'undefined') return;

  // Initialize Google Analytics
  if (process.env.VITE_GA_MEASUREMENT_ID) {
    initGoogleAnalytics(process.env.VITE_GA_MEASUREMENT_ID);
  }

  // Initialize Hotjar
  if (process.env.VITE_HOTJAR_SITE_ID) {
    initHotjar(process.env.VITE_HOTJAR_SITE_ID);
  }

  // Initialize Sentry
  if (process.env.VITE_SENTRY_DSN) {
    initSentry(process.env.VITE_SENTRY_DSN, process.env.VITE_ENV || 'production');
  }

  // Initialize session tracking
  initSessionTracking();

  // Track initial page load
  trackPageLoad();
  trackPageView(window.location.pathname);

  // Track performance metrics
  if (window.performance) {
    window.addEventListener('load', () => {
      setTimeout(() => {
        trackPageLoad();
      }, 1000);
    });
  }
}

