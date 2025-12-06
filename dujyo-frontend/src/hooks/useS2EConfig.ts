import { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../utils/apiConfig';

export interface S2EConfig {
  listenerRate: number;
  artistRate: number;
  dailyLimitListener: number;
  dailyLimitArtist: number;
  poolTotal: number;
  poolRemaining: number;
  poolMonth: string;
}

export const useS2EConfig = () => {
  const [config, setConfig] = useState<S2EConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/v1/s2e/config`);
        if (response.ok) {
          const data = await response.json();
          setConfig(data);
        } else {
          // Fallback to conservative values (Opción A3 + Pool 2M)
          setConfig({
            listenerRate: 0.10,
            artistRate: 0.50,
            dailyLimitListener: 90,
            dailyLimitArtist: 120,
            poolTotal: 2000000,
            poolRemaining: 2000000,
            poolMonth: new Date().toISOString().slice(0, 7),
          });
        }
      } catch (error) {
        console.error('Failed to fetch S2E config:', error);
        // Fallback to conservative values (Opción A3 + Pool 2M)
        setConfig({
          listenerRate: 0.10,
          artistRate: 0.50,
          dailyLimitListener: 90,
          dailyLimitArtist: 120,
          poolTotal: 2000000,
          poolRemaining: 2000000,
          poolMonth: new Date().toISOString().slice(0, 7),
        });
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
    const interval = setInterval(fetchConfig, 300000); // Every 5 min

    return () => clearInterval(interval);
  }, []);

  return { config, loading };
};

