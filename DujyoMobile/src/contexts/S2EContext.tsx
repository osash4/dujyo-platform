/**
 * S2E Context - Stream-to-Earn state management for mobile
 * Handles S2E tracking, stats, and background monitoring
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import apiClient from '../services/api';

export interface S2EStats {
  total_dyo: number;
  dyo_today: number;
  dyo_week: number;
  dyo_month: number;
  daily_used: number;
  daily_remaining: number;
  daily_limit: number;
}

export interface DailyLimits {
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
}

export interface S2ELimits {
  daily_limits: DailyLimits;
  cooldown_active: boolean;
  cooldown_ends_at: string | null;
}

interface S2EContextType {
  // Estado
  stats: S2EStats | null;
  limits: S2ELimits | null;
  totalEarned: number;
  todayEarnings: number;
  weeklyEarnings: number;
  monthlyEarnings: number;
  dailyLimits: DailyLimits | null;
  cooldownActive: boolean;
  isLoading: boolean;

  // Métodos
  trackS2EEarning: (contentId: string, seconds: number, trackTitle?: string, artist?: string) => Promise<void>;
  refreshStats: () => Promise<void>;
  refreshLimits: () => Promise<void>;

  // Background tracking
  isTrackingActive: boolean;
  startBackgroundTracking: () => void;
  stopBackgroundTracking: () => void;
}

const S2EContext = createContext<S2EContextType | undefined>(undefined);

interface S2EProviderProps {
  children: React.ReactNode;
  userAddress?: string | null; // Pass from AuthContext
}

export const S2EProvider: React.FC<S2EProviderProps> = ({ children, userAddress: propUserAddress }) => {
  const [stats, setStats] = useState<S2EStats | null>(null);
  const [limits, setLimits] = useState<S2ELimits | null>(null);
  const [isTrackingActive, setIsTrackingActive] = useState(true); // Active by default
  const [isLoading, setIsLoading] = useState(true);
  
  const userAddress = propUserAddress || null;

  // Monitorear estado de la app para pausar S2E en background
  useEffect(() => {
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background') {
        // Pausar tracking S2E en background (excepto si está reproduciendo)
        // Note: Si el audio está en background, el tracking puede continuar
        // setIsTrackingActive(false);
      } else if (nextAppState === 'active') {
        // Reanudar si estaba activo
        setIsTrackingActive(true);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, []);

  const trackS2EEarning = useCallback(async (contentId: string, seconds: number) => {
    if (!isTrackingActive || !userAddress) return;

    try {
      // Get track info (TODO: pass from PlayerContext)
      const trackData = {
        track_id: contentId,
        track_title: 'Current Track', // TODO: Get from current track
        artist: 'Artist', // TODO: Get from current track
        duration_seconds: seconds,
        content_id: contentId,
      };

      await apiClient.sendStreamTick('listener', trackData);

      // Refresh stats after earning
      await refreshStats();
      await refreshLimits();
    } catch (error) {
      console.error('Error tracking S2E earning:', error);
    }
  }, [isTrackingActive, userAddress]);

  const refreshStats = useCallback(async () => {
    if (!userAddress) return;

    try {
      const statsData = await apiClient.getS2EUserStats(userAddress);
      setStats(statsData);
    } catch (error) {
      console.error('Error refreshing S2E stats:', error);
    }
  }, [userAddress]);

  const refreshLimits = useCallback(async () => {
    if (!userAddress) return;

    try {
      const limitsData = await apiClient.getS2EUserLimits(userAddress);
      setLimits(limitsData);
    } catch (error) {
      console.error('Error refreshing S2E limits:', error);
    }
  }, [userAddress]);

  // Auto-refresh stats every 30 seconds
  useEffect(() => {
    if (!userAddress) {
      setIsLoading(false);
      return;
    }

    refreshStats();
    refreshLimits();
    setIsLoading(false);

    const interval = setInterval(() => {
      refreshStats();
      refreshLimits();
    }, 30000); // Every 30 seconds

    return () => clearInterval(interval);
  }, [userAddress, refreshStats, refreshLimits]);

  const value: S2EContextType = {
    stats,
    limits,
    totalEarned: stats?.total_dyo || 0,
    todayEarnings: stats?.dyo_today || 0,
    weeklyEarnings: stats?.dyo_week || 0,
    monthlyEarnings: stats?.dyo_month || 0,
    dailyLimits: limits?.daily_limits || null,
    cooldownActive: limits?.cooldown_active || false,
    isLoading,
    trackS2EEarning,
    refreshStats,
    refreshLimits,
    isTrackingActive,
    startBackgroundTracking: () => setIsTrackingActive(true),
    stopBackgroundTracking: () => setIsTrackingActive(false),
  };

  return <S2EContext.Provider value={value}>{children}</S2EContext.Provider>;
};

export const useS2E = (): S2EContextType => {
  const context = useContext(S2EContext);
  if (!context) {
    throw new Error('useS2E must be used within S2EProvider');
  }
  return context;
};

