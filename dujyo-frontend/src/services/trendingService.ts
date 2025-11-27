import { getApiBaseUrl } from '../utils/apiConfig';

const getAuthToken = () => {
  return localStorage.getItem('jwt_token');
};

export interface TrendingItem {
  id: string;
  title: string;
  type: string;
  thumbnail_url: string | null;
  artist_name: string | null;
  trend_score: number;
  trend_direction: 'up' | 'down' | 'stable';
  play_count: number;
  like_count: number;
  comment_count: number;
}

export interface TrendingResponse {
  success: boolean;
  items: TrendingItem[];
  period: string;
}

/**
 * Get trending content
 */
export async function getTrending(
  period: '24h' | '7d' | '30d' = '24h',
  limit: number = 20
): Promise<TrendingResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(
    `${apiBaseUrl}/api/v1/trending?period=${period}&limit=${limit}`,
    {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get trending: ${response.status}`);
  }
  
  return response.json();
}

