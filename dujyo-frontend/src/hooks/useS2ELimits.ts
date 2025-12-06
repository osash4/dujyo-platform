import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getApiBaseUrl } from '../utils/apiConfig';

export interface S2ELimits {
  daily_limits: {
    session_minutes: {
      used: number;
      limit: number;
      remaining: number;
    };
    content_minutes: {
      used: number;
      limit: number;
      remaining: number;
    };
  };
  cooldown_active: boolean;
  cooldown_ends_at: string | null;
}

export const useS2ELimits = () => {
  const { user, getToken } = useAuth();
  const [limits, setLimits] = useState<S2ELimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchLimits = async () => {
    if (!user?.wallet_address) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = getToken();
      
      const response = await fetch(
        `${apiBaseUrl}/api/v1/s2e/user/limits/${user.wallet_address}`,
        {
          headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` }),
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch limits: ${response.statusText}`);
      }

      const data: S2ELimits = await response.json();
      setLimits(data);
    } catch (err: any) {
      console.error('Error fetching S2E limits:', err);
      setError(err.message || 'Failed to fetch limits');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLimits();
    // Refresh every 30 seconds
    const interval = setInterval(fetchLimits, 30000);
    return () => clearInterval(interval);
  }, [user?.wallet_address]);

  return { limits, loading, error, refetch: fetchLimits };
};

