import { getApiBaseUrl } from '../utils/apiConfig';

const getAuthToken = () => {
  return localStorage.getItem('jwt_token');
};

export interface Comment {
  comment_id: string;
  content_id: string;
  user_id: string;
  username: string | null;
  comment_text: string;
  parent_comment_id: string | null;
  likes_count: number;
  is_liked: boolean;
  created_at: string;
  updated_at: string;
  is_edited: boolean;
  replies: Comment[];
}

export interface CommentListResponse {
  success: boolean;
  comments: Comment[];
  total: number;
}

export interface CommentResponse {
  success: boolean;
  comment: Comment | null;
  message: string;
}

export interface CreateCommentRequest {
  comment_text: string;
  parent_comment_id?: string;
}

/**
 * Create a comment
 */
export async function createComment(
  contentId: string,
  request: CreateCommentRequest
): Promise<CommentResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/content/${contentId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to create comment: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Get comments for content
 */
export async function getComments(
  contentId: string,
  limit: number = 50,
  offset: number = 0
): Promise<CommentListResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(
    `${apiBaseUrl}/api/v1/content/${contentId}/comments?limit=${limit}&offset=${offset}`,
    {
      headers: {
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to get comments: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Update a comment
 */
export async function updateComment(
  commentId: string,
  request: CreateCommentRequest
): Promise<CommentResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/content/comments/${commentId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  });
  
  if (!response.ok) {
    throw new Error(`Failed to update comment: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Delete a comment
 */
export async function deleteComment(commentId: string): Promise<CommentResponse> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/content/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to delete comment: ${response.status}`);
  }
  
  return response.json();
}

/**
 * Like/unlike a comment
 */
export async function toggleCommentLike(commentId: string): Promise<{ success: boolean; is_liked: boolean; message: string }> {
  const token = getAuthToken();
  const apiBaseUrl = getApiBaseUrl();
  
  const response = await fetch(`${apiBaseUrl}/api/v1/content/comments/${commentId}/like`, {
    method: 'POST',
    headers: {
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
    },
  });
  
  if (!response.ok) {
    throw new Error(`Failed to toggle comment like: ${response.status}`);
  }
  
  return response.json();
}

