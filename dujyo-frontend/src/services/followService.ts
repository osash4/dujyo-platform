import { getApiBaseUrl } from '../utils/apiConfig';

const getAuthToken = () => {
  return localStorage.getItem('jwt_token');
};

export interface FollowUser {
  user_id: string;
  username: string | null;
  email: string | null;
  wallet_address: string;
  followed_at: string | null;
}

export interface FollowResponse {
  success: boolean;
  message: string;
  is_following: boolean;
}

export interface FollowListResponse {
  success: boolean;
  users: FollowUser[];
  total: number;
}

export interface FollowStatsResponse {
  success: boolean;
  followers_count: number;
  following_count: number;
  is_following: boolean;
}

/**
 * Follow a user
 */
export async function followUser(userId: string): Promise<FollowResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/users/${userId}/follow`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to follow user: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Unfollow a user
 */
export async function unfollowUser(userId: string): Promise<FollowResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/users/${userId}/follow`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to unfollow user: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get user's followers
 */
export async function getFollowers(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<FollowListResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(
    `${apiBaseUrl}/api/v1/users/${userId}/followers?limit=${limit}&offset=${offset}`,
    {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get followers: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get users that this user follows
 */
export async function getFollowing(
  userId: string,
  limit: number = 50,
  offset: number = 0
): Promise<FollowListResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(
    `${apiBaseUrl}/api/v1/users/${userId}/following?limit=${limit}&offset=${offset}`,
    {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get following: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get follow statistics
 */
export async function getFollowStats(userId: string): Promise<FollowStatsResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(
    `${apiBaseUrl}/api/v1/users/${userId}/follow-stats`,
    {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get follow stats: ${response.status}`);
  }
  
  return response.json();
}

