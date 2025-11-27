import { getApiBaseUrl } from '../utils/apiConfig';

const getAuthToken = () => {
  return localStorage.getItem('jwt_token');
};

export interface Achievement {
  achievement_id: string;
  achievement_code: string;
  name: string;
  description: string | null;
  icon_url: string | null;
  category: string | null;
  rarity: string;
  points: number;
  unlocked_at: string | null;
  progress: number;
}

export interface AchievementListResponse {
  success: boolean;
  achievements: Achievement[];
  total: number;
}

/**
 * Get available achievements
 */
export async function getAvailableAchievements(): Promise<AchievementListResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/achievements`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get achievements: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get user achievements
 */
export async function getUserAchievements(userId: string): Promise<AchievementListResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/achievements/users/${userId}/achievements`, {
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to get user achievements: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Unlock an achievement
 */
export async function unlockAchievement(achievementCode: string): Promise<{ success: boolean; message: string }> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/achievements/${achievementCode}/unlock`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to unlock achievement: ${response.status}`);
  }
  
  return response.json();
}

