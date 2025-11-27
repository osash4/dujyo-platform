import { getApiBaseUrl } from '../utils/apiConfig';

export interface SearchResult {
  id: string;
  title: string;
  type: 'music' | 'video' | 'gaming' | 'user' | 'playlist';
  description?: string;
  image?: string;
  artist?: string;
  duration?: string;
  rating?: number;
  url?: string;
}

export interface SearchResponse {
  success: boolean;
  results: SearchResult[];
  total: number;
  query: string;
}

const getAuthToken = (): string | null => {
  return localStorage.getItem('jwt_token');
};

const getHeaders = () => {
  const token = getAuthToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };
};

export const searchContent = async (
  query: string,
  type?: 'music' | 'video' | 'gaming' | 'all',
  limit: number = 20
): Promise<SearchResponse> => {
  const apiBaseUrl = getApiBaseUrl();
  const params = new URLSearchParams({
    q: query,
    limit: limit.toString(),
  });
  
  if (type && type !== 'all') {
    params.append('type', type);
  }
  
  const response = await fetch(`${apiBaseUrl}/api/v1/search?${params.toString()}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Search failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

