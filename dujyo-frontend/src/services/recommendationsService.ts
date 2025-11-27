import { getApiBaseUrl } from '../utils/apiConfig';

export interface Recommendation {
  id: string;
  title: string;
  type: 'music' | 'video' | 'gaming' | 'playlist';
  description?: string;
  image?: string;
  artist?: string;
  reason: string; // Why it's recommended
  score?: number; // Recommendation score
}

export interface RecommendationsResponse {
  success: boolean;
  recommendations: Recommendation[];
  based_on: 'history' | 'genre' | 'similar_artists' | 'trending' | 'mixed';
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

// Get recommendations based on listening history
export const getHistoryBasedRecommendations = async (limit: number = 20): Promise<RecommendationsResponse> => {
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/recommendations/history?limit=${limit}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get recommendations: ${response.statusText}`);
  }

  const data = await response.json();
  return data;

// Get recommendations based on genre
export const getGenreBasedRecommendations = async (genre: string, limit: number = 20): Promise<RecommendationsResponse> => {
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/recommendations/genre?genre=${genre}&limit=${limit}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get genre recommendations: ${response.statusText}`);
  }

  const data = await response.json();
  return data;

// Get recommendations based on similar artists
export const getSimilarArtistsRecommendations = async (artistId: string, limit: number = 20): Promise<RecommendationsResponse> => {
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/recommendations/similar?artist_id=${artistId}&limit=${limit}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get similar artist recommendations: ${response.statusText}`);
  }

  const data = await response.json();
  return data;

// Get mixed recommendations (combines multiple strategies)
export const getMixedRecommendations = async (limit: number = 20): Promise<RecommendationsResponse> => {
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/recommendations?type=mixed&limit=${limit}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error(`Failed to get mixed recommendations: ${response.statusText}`);
  }

  const data = await response.json();
  return data;
};

