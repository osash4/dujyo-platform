import { getApiBaseUrl } from '../utils/apiConfig';

const getAuthToken = () => {
  return localStorage.getItem('jwt_token');
};

export interface UserStats {
  total_listening_minutes: number;
  total_content_played: number;
  total_likes_given: number;
  total_comments_made: number;
  total_reviews_written: number;
  total_followers: number;
  total_following: number;
  favorite_genres: string[];
  longest_streak_days: number;
  current_streak_days: number;
  last_active_at: string | null;
}

export interface UserStatsResponse {
  success: boolean;
  stats: UserStats;
}

/**
 * Get user statistics
 */
export async function getUserStats(userId: string): Promise<UserStatsResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/users/${userId}/stats`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get user stats: ${response.status}`);
  }
  
  return response.json();
}

