// Custom hooks for Royalties data fetching
import { useState, useEffect, useCallback } from 'react';
import {
  royaltiesApi,
  type ArtistRoyalties,
  type ExternalRoyaltyReport,
  type RoyaltyReportResponse,
  type RoyaltyDistribution,
  type PendingRoyalties,
} from '../services/royaltiesApi';

/**
 * Hook to fetch artist royalties
 */
export function useArtistRoyalties(artistId: string | null) {
  const [data, setData] = useState<ArtistRoyalties | null>(null);
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
      const royalties = await royaltiesApi.getArtistRoyalties(artistId);
      setData(royalties);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [artistId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

/**
 * Hook to submit external royalty reports
 */
export function useSubmitRoyaltyReport() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [response, setResponse] = useState<RoyaltyReportResponse | null>(null);

  const submitReport = useCallback(async (report: ExternalRoyaltyReport) => {
    try {
      setLoading(true);
      setError(null);
      const result = await royaltiesApi.submitExternalReport(report);
      setResponse(result);
      return result;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const reset = useCallback(() => {
    setError(null);
    setResponse(null);
  }, []);

  return { submitReport, loading, error, response, reset };
}

/**
 * Hook to fetch royalty distribution
 */
export function useRoyaltyDistribution() {
  const [data, setData] = useState<RoyaltyDistribution | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const distribution = await royaltiesApi.getRoyaltyDistribution();
      setData(distribution);
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
 * Hook to fetch pending royalties
 */
export function usePendingRoyalties() {
  const [data, setData] = useState<PendingRoyalties | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const pending = await royaltiesApi.getPendingRoyalties();
      setData(pending);
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

