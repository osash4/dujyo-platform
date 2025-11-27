import { getApiBaseUrl } from '../utils/apiConfig';

const getAuthToken = () => {
  return localStorage.getItem('jwt_token');
};

export interface Notification {
  notification_id: string;
  notification_type: string;
  title: string;
  message: string;
  related_content_id: string | null;
  related_user_id: string | null;
  is_read: boolean;
  created_at: string;
  metadata: Record<string, any>;
}

export interface NotificationListResponse {
  success: boolean;
  notifications: Notification[];
  total: number;
  unread_count: number;
}

export interface NotificationPreferences {
  notification_type: string;
  enabled: boolean;
  email_enabled: boolean;
  push_enabled: boolean;
}

/**
 * Get notifications
 */
export async function getNotifications(
  limit: number = 50,
  offset: number = 0,
  unreadOnly: boolean = false
): Promise<NotificationListResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(
    `${apiBaseUrl}/api/v1/notifications?limit=${limit}&offset=${offset}&unread_only=${unreadOnly}`,
    {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get notifications: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Mark notification as read
 */
export async function markNotificationRead(notificationId: string): Promise<{ success: boolean; message: string }> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/notifications/${notificationId}/read`, {
    method: 'PUT',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to mark notification as read: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Mark all notifications as read
 */
export async function markAllNotificationsRead(): Promise<{ success: boolean; message: string }> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/notifications/read-all`, {
    method: 'PUT',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to mark all notifications as read: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get notification preferences
 */
export async function getNotificationPreferences(): Promise<{ success: boolean; preferences: Record<string, any> }> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/notifications/preferences`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get notification preferences: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Update notification preferences
 */
export async function updateNotificationPreferences(
  preferences: NotificationPreferences
): Promise<{ success: boolean; message: string }> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/notifications/preferences`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(preferences),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update notification preferences: ${response.status}`);
  }
  
  return response.json();
}

