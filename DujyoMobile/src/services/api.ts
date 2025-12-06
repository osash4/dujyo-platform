/**
 * API Client for Dujyo Mobile App
 * Shared with web frontend, adapted for React Native
 */

import { Platform } from 'react-native';

// Get API base URL from environment or default
const getApiBaseUrl = (): string => {
  // In React Native, we can use __DEV__ to detect development
  if (__DEV__) {
    // Development: localhost or your dev server
    return Platform.select({
      ios: 'http://localhost:8083',
      android: 'http://10.0.2.2:8083', // Android emulator uses 10.0.2.2 for localhost
      default: 'http://localhost:8083',
    }) || 'http://localhost:8083';
  }
  
  // Production: your production API URL
  return process.env.API_BASE_URL || 'https://api.dujyo.com';
};

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor() {
    this.baseUrl = getApiBaseUrl();
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          errorData = { message: errorText };
        }
        
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data as T;
    } catch (error) {
      console.error(`[API] Error in ${endpoint}:`, error);
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // S2E specific endpoints
  async getS2EConfig() {
    return this.get('/api/v1/s2e/config');
  }

  async getS2EUserStats(address: string) {
    return this.get(`/api/v1/s2e/user/stats/${address}`);
  }

  async getS2EUserLimits(address: string) {
    return this.get(`/api/v1/s2e/user/limits/${address}`);
  }

  async getS2EHistory() {
    return this.get('/api/v1/stream-earn/history');
  }

  async sendStreamTick(role: 'listener' | 'artist', data: {
    track_id: string;
    track_title: string;
    artist: string;
    duration_seconds: number;
    content_id: string;
    genre?: string;
  }) {
    return this.post(`/api/v1/stream-earn/${role}`, data);
  }

  // Get S2E user limits
  async getS2EUserLimits(address: string) {
    return this.get(`/api/v1/s2e/user/limits/${address}`);
  }

  // Register notification token
  async registerNotificationToken(data: {
    token: string;
    platform: string;
    device_id: string;
  }) {
    return this.post('/api/v1/notifications/register-token', data);
  }

  // Auth endpoints
  async login(email: string, password: string) {
    const response = await this.post<{ token: string; user: any }>('/login', {
      email,
      password,
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  async register(email: string, password: string, username?: string) {
    const response = await this.post<{ token: string; user: any }>('/register', {
      email,
      password,
      username,
    });
    if (response.token) {
      this.setToken(response.token);
    }
    return response;
  }

  // Content endpoints
  async searchContent(query: string, type?: 'audio' | 'video' | 'gaming') {
    const params = new URLSearchParams({ q: query });
    if (type) params.append('type', type);
    return this.get(`/api/v1/search?${params.toString()}`);
  }

  async getContent(contentId: string) {
    return this.get(`/api/v1/content/${contentId}`);
  }

  // User endpoints
  async getUserProfile(address: string) {
    return this.get(`/api/v1/user/${address}`);
  }
}

export const apiClient = new ApiClient();
export default apiClient;

