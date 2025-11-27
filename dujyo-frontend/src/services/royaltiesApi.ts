// Royalties API Service
// Connects to backend royalties endpoints

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8083';

export interface ArtistRoyalties {
  artist_id: string;
  artist_name: string;
  total_earned: number;
  pending_payout: number;
  last_payout_date: string | null;
  payment_history: Array<{
    payment_id: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    source: string;
    transaction_hash: string | null;
  }>;
  cross_platform_earnings: {
    spotify: PlatformEarning;
    apple_music: PlatformEarning;
    youtube: PlatformEarning;
    dujyo: PlatformEarning;
    total: number;
  };
  revenue_streams: Array<{
    stream_type: string;
    amount: number;
    percentage: number;
    transactions: number;
  }>;
}

export interface PlatformEarning {
  platform_name: string;
  total_earned: number;
  streams: number;
  rate_per_stream: number;
  last_sync: string;
}

export interface ExternalRoyaltyReport {
  artist_id: string;
  platform: string;
  streams: number;
  revenue: number;
  period_start: string;
  period_end: string;
  tracks: Array<{
    track_id: string;
    track_name: string;
    streams: number;
    revenue: number;
    isrc?: string;
  }>;
}

export interface RoyaltyReportResponse {
  success: boolean;
  message: string;
  report_id: string | null;
  total_revenue_processed: number;
}

export interface RoyaltyDistribution {
  total_pool: number;
  distributions: Array<{
    artist_id: string;
    artist_name: string;
    amount: number;
    percentage: number;
    streams: number;
  }>;
  timestamp: number;
}

export interface PendingRoyalties {
  total_pending: number;
  payment_count: number;
  payments: Array<{
    artist_id: string;
    artist_name: string;
    amount: number;
    scheduled_date: string;
    sources: string[];
  }>;
}

class RoyaltiesApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Get royalties for a specific artist
   */
  async getArtistRoyalties(artistId: string): Promise<ArtistRoyalties> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/royalties/artist/${artistId}`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error(`Error fetching royalties for artist ${artistId}:`, error);
      throw error;
    }
  }

  /**
   * Submit external royalty report
   */
  async submitExternalReport(
    report: ExternalRoyaltyReport
  ): Promise<RoyaltyReportResponse> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/royalties/external-report`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(report),
        }
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error submitting external royalty report:', error);
      throw error;
    }
  }

  /**
   * Get current royalty distribution
   */
  async getRoyaltyDistribution(): Promise<RoyaltyDistribution> {
    try {
      const response = await fetch(
        `${this.baseUrl}/api/v1/royalties/distribution`
      );
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching royalty distribution:', error);
      throw error;
    }
  }

  /**
   * Get pending royalties
   */
  async getPendingRoyalties(): Promise<PendingRoyalties> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v1/royalties/pending`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Error fetching pending royalties:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const royaltiesApi = new RoyaltiesApiService();

// Export class for testing
export default RoyaltiesApiService;

