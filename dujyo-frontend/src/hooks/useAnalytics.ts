// Custom hooks for Analytics data fetching
import { useState, useEffect, useCallback } from 'react';
import {
  analyticsApi,
  type PlatformAnalytics,
  type ArtistAnalytics,
  type RealTimeAnalytics,
} from '../services/analyticsApi';

/**
 * Hook to fetch platform-wide analytics
 */
export function usePlatformAnalytics() {
  const [data, setData] = useState<PlatformAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const analytics = await analyticsApi.getPlatformAnalytics();
      setData(analytics);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch artist-specific analytics
 */
export function useArtistAnalytics(
  artistId: string | null,
  params?: { period?: string; limit?: number }
) {
  const [data, setData] = useState<ArtistAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    if (!artistId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const analytics = await analyticsApi.getArtistAnalytics(artistId, params);
      setData(analytics);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [artistId, params?.period, params?.limit]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to fetch real-time analytics
 * Includes auto-refresh capability
 */
export function useRealTimeAnalytics(refreshInterval?: number) {
  const [data, setData] = useState<RealTimeAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const analytics = await analyticsApi.getRealTimeAnalytics();
      setData(analytics);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    // Set up auto-refresh if interval is provided
    if (refreshInterval && refreshInterval > 0) {
      const intervalId = setInterval(fetchData, refreshInterval);
      return () => clearInterval(intervalId);
    }
  }, [fetchData, refreshInterval]);

  return { data, loading, error, refetch: fetchData };
}

