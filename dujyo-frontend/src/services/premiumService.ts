import { getApiBaseUrl } from '../utils/apiConfig';

const getAuthToken = () => {
  return localStorage.getItem('jwt_token');
};

export interface PremiumSubscription {
  subscription_id: string;
  plan_type: string;
  status: string;
  started_at: string;
  expires_at: string | null;
  cancelled_at: string | null;
}

export interface SubscriptionResponse {
  success: boolean;
  subscription: PremiumSubscription | null;
  message: string;
}

export interface CreateSubscriptionRequest {
  plan_type: 'monthly' | 'yearly' | 'lifetime';
  payment_method?: string;
}

export interface ContentAccessResponse {
  success: boolean;
  has_access: boolean;
  reason: string;
}

/**
 * Create a premium subscription
 */
export async function createSubscription(
  request: CreateSubscriptionRequest
): Promise<SubscriptionResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/premium/subscribe`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create subscription: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get current subscription
 */
export async function getSubscription(): Promise<SubscriptionResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/premium/subscription`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get subscription: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Cancel subscription
 */
export async function cancelSubscription(): Promise<SubscriptionResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/premium/subscription`, {
    method: 'DELETE',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to cancel subscription: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Check content access
 */
export async function checkContentAccess(contentId: string): Promise<ContentAccessResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/premium/content/${contentId}/access`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to check content access: ${response.status}`);
  }
  
  return response.json();
}

