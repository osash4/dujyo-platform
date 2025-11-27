import { useState, useEffect, useCallback } from 'react';
import {
  getDiscoveryLeaderboard,
  getUserDiscoveryStats,
  recordListening,
  claimRewards,
  DiscoveryLeaderboard,
  UserDiscoveryStats,
  RecordListeningRequest,
  RecordListeningResponse,
  ClaimRewardsRequest,
  ClaimRewardsResponse,
} from '../services/discoveryApi';

// ============================================================================
// useDiscoveryLeaderboard Hook
// ============================================================================

export function useDiscoveryLeaderboard(autoRefresh: boolean = false, refreshInterval: number = 60000) {
  const [leaderboard, setLeaderboard] = useState<DiscoveryLeaderboard | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLeaderboard = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getDiscoveryLeaderboard();
      setLeaderboard(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch leaderboard');
      console.error('Error fetching discovery leaderboard:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLeaderboard();

    if (autoRefresh) {
      const interval = setInterval(fetchLeaderboard, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchLeaderboard, autoRefresh, refreshInterval]);

  return { leaderboard, loading, error, refetch: fetchLeaderboard };
}

// ============================================================================
// useUserDiscoveryStats Hook
// ============================================================================

export function useUserDiscoveryStats(userId: string, autoRefresh: boolean = false, refreshInterval: number = 30000) {
  const [stats, setStats] = useState<UserDiscoveryStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    if (!userId) {
      setError('User ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const data = await getUserDiscoveryStats(userId);
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch user stats');
      console.error('Error fetching user discovery stats:', err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchStats();

    if (autoRefresh) {
      const interval = setInterval(fetchStats, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchStats, autoRefresh, refreshInterval]);

  return { stats, loading, error, refetch: fetchStats };
}

// ============================================================================
// useRecordListening Hook
// ============================================================================

export function useRecordListening() {
  const [recording, setRecording] = useState<boolean>(false);
  const [response, setResponse] = useState<RecordListeningResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const recordListen = useCallback(async (request: RecordListeningRequest) => {
    try {
      setRecording(true);
      setError(null);
      const data = await recordListening(request);
      setResponse(data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to record listening';
      setError(errorMsg);
      console.error('Error recording listening:', err);
      throw err;
    } finally {
      setRecording(false);
    }
  }, []);

  return { recordListen, recording, response, error };
}

// ============================================================================
// useClaimRewards Hook
// ============================================================================

export function useClaimRewards() {
  const [claiming, setClaiming] = useState<boolean>(false);
  const [response, setResponse] = useState<ClaimRewardsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const claimRewardsAction = useCallback(async (request: ClaimRewardsRequest) => {
    try {
      setClaiming(true);
      setError(null);
      const data = await claimRewards(request);
      setResponse(data);
      return data;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to claim rewards';
      setError(errorMsg);
      console.error('Error claiming rewards:', err);
      throw err;
    } finally {
      setClaiming(false);
    }
  }, []);

  return { claimRewards: claimRewardsAction, claiming, response, error };
}

