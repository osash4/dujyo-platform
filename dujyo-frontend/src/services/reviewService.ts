import { getApiBaseUrl } from '../utils/apiConfig';

const getAuthToken = () => {
  return localStorage.getItem('jwt_token');
};

export interface Review {
  review_id: string;
  content_id: string;
  user_id: string;
  username: string | null;
  rating: number;
  review_text: string | null;
  helpful_count: number;
  is_helpful: boolean;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
}

export interface ReviewListResponse {
  success: boolean;
  reviews: Review[];
  total: number;
  average_rating: number;
}

export interface ReviewResponse {
  success: boolean;
  review: Review | null;
  message: string;
}

export interface CreateReviewRequest {
  rating: number;
  review_text?: string;
}

/**
 * Create or update a review
 */
export async function createReview(
  contentId: string,
  request: CreateReviewRequest
): Promise<ReviewResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/content/${contentId}/reviews`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create review: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get reviews for content
 */
export async function getReviews(
  contentId: string,
  limit: number = 20,
  offset: number = 0
): Promise<ReviewListResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(
    `${apiBaseUrl}/api/v1/content/${contentId}/reviews?limit=${limit}&offset=${offset}`,
    {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get reviews: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Toggle helpful vote on a review
 */
export async function toggleReviewHelpful(reviewId: string): Promise<{ success: boolean; is_helpful: boolean; message: string }> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/content/reviews/${reviewId}/helpful`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to toggle review helpful: ${response.status}`);
  }
  
  return response.json();
}

