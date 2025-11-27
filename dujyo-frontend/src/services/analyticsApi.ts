// Analytics API Service
// Connects to backend analytics endpoints

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083';

export interface PlatformAnalytics {
  total_artists: number;
  total_tracks: number;
  total_streams: number;
  total_revenue: number;
  active_users_24h: number;
  new_signups_24h: number;
  avg_session_duration: number;
  top_genres: Array<{
    genre: string;
    streams: number;
    percentage: number;
  }>;
}

export interface ArtistAnalytics {
  artist_id: string;
  total_streams: number;
  total_revenue: number;
  total_tracks: number;
  avg_streams_per_track: number;
  top_tracks: Array<{
    track_id: string;
    track_name: string;
    streams: number;
    revenue: number;
    release_date: string;
    growth_rate: number;
  }>;
  revenue_by_period: Array<{
    period: string;
    revenue: number;
    streams: number;
  }>;
  audience_demographics: {
    top_countries: Array<{
      country: string;
      listeners: number;
      percentage: number;
    }>;
    age_distribution: Record<string, number>;
    gender_distribution: Record<string, number>;
  };
  cross_platform_stats: {
    spotify_streams: number;
    apple_music_streams: number;
    youtube_views: number;
    dujyo_streams: number;
    total_cross_platform: number;
  };
}

export interface RealTimeAnalytics {
  current_listeners: number;
  streams_last_hour: number;
  revenue_last_hour: number;
  trending_tracks: Array<{
    track_id: string;
    track_name: string;
    streams: number;
    revenue: number;
    release_date: string;
    growth_rate: number;
  }>;
  active_regions: string[];
  timestamp: number;
}

class AnalyticsApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get platform-wide analytics
   */
  async getPlatformAnalytics(): Promise<PlatformAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/analytics/platform`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching platform analytics:', error);
      throw error;
    }
  }

  /**
   * Get analytics for a specific artist
   */
  async getArtistAnalytics(
    artistId: string,
    params?: { period?: string; limit?: number }
  ): Promise<ArtistAnalytics> {
    try {
      const queryParams = new URLSearchParams();
      if (params?.period) queryParams.append('period', params.period);
      if (params?.limit) queryParams.append('limit', params.limit.toString());

      const url = `${this.baseUrl}/api/v1/analytics/artist/${artistId}${
        queryParams.toString() ? `?${queryParams.toString()}` : ''
      }`;

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching analytics for artist ${artistId}:`, error);
      throw error;
    }
  }

  /**
   * Get real-time analytics
   */
  async getRealTimeAnalytics(): Promise<RealTimeAnalytics> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/analytics/real-time`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching real-time analytics:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const analyticsApi = new AnalyticsApiService();

// Export class for testing
export default AnalyticsApiService;

