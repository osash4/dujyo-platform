import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getApiBaseUrl } from '../utils/apiConfig';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useEventListener } from '../contexts/EventBusContext';

interface RealtimeBalanceOptions {
  // Polling intervals (in milliseconds)
  activePollingInterval?: number;  // When player is active
  inactivePollingInterval?: number; // When player is paused/stopped
  // WebSocket support
  useWebSocket?: boolean;
  // Retry configuration
  maxRetries?: number;
  retryDelay?: number;
}

export const useRealtimeBalance = (options: RealtimeBalanceOptions = {}) => {
  const {
    activePollingInterval = 5000,    // 5 seconds when playing
    inactivePollingInterval = 30000, // 30 seconds when paused
    maxRetries = 3,
    retryDelay = 1000
  } = options;

  // ✅ DEBUG CRÍTICO: VER QUÉ VALORES RECIBE REALMENTE
  console.log("🔧 [DEBUG] useRealtimeBalance - Options Received:", {
    activePollingInterval,    
    inactivePollingInterval,
    optionsPassed: options,   // ← CAMBIAR para ver objeto COMPLETO
    optionsString: JSON.stringify(options), // ← VER CONTENIDO REAL
    defaultActive: 5000,      
    defaultInactive: 30000,  
    timestamp: Date.now()
  });

  const { user } = useAuth();

  // ✅ DEBUG ADICIONAL: VERIFICAR MÚLTIPLES INSTANCIAS
  console.log("🔍 [DEBUG] useRealtimeBalance - Hook Instance:", {
    hookId: Math.random().toString(36).substr(2, 9), // ID único para esta instancia
    optionsReceived: options,
    walletAddress: user?.uid,
    timestamp: Date.now()
  });
  const { isPlaying, currentTrack } = usePlayerContext();
  
  const [balance, setBalance] = useState<number>(0);
  const [dysBalance, setUsdyoBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<number>(0);
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);
  const walletAddress = user?.uid;

  // Determine current polling interval based on player state
  const getCurrentPollingInterval = useCallback(() => {
    console.log("🔍 [DEBUG] useRealtimeBalance - Player State:", {
      currentTrack: currentTrack ? currentTrack.title : "NULL",
      isPlaying,
      hasTrack: !!currentTrack,
      playerActive: !!(currentTrack && isPlaying),
      source: 'useRealtimeBalance',
      timestamp: Date.now()
    });
    
    if (currentTrack && isPlaying) {
      console.log("✅ [DEBUG] Player ACTIVE - 2000ms interval");
      return activePollingInterval;
    }
    console.log("❌ [DEBUG] Player INACTIVE - 15000ms interval");
    return inactivePollingInterval;
  }, [currentTrack, isPlaying, activePollingInterval, inactivePollingInterval]);

  // Fetch balance from backend
  const fetchBalance = useCallback(async (): Promise<{ dyo: number; dys: number }> => {
    if (!walletAddress) {
      throw new Error('No wallet address available');
    }

    try {
      // ✅ DEBUG CRÍTICO: VER QUÉ BALANCE RECIBE DEL BACKEND
      const apiBaseUrl = getApiBaseUrl();
      const url = `${apiBaseUrl}/balance-detail/${walletAddress}`;
      console.log("🌐 [DEBUG] Fetching balance from:", url);
      
      const token = localStorage.getItem('jwt_token');
      const headers: HeadersInit = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, { headers });

      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.status}`);
      }

      const data = await response.json();
      
      console.log("💰 [DEBUG] Balance Response Received:", {
        available_dyo: data.available_dyo,
        dys: data.dys,
        fullData: data,
        walletAddress,
        timestamp: Date.now()
      });

      return {
        dyo: data.available_dyo || 0,
        dys: data.dys || 0
      };
    } catch (error) {
      console.error('Error fetching balance:', error);
      throw error;
    }
  }, [walletAddress]);

  // Update balance with animation
  const updateBalance = useCallback(async (forceUpdate = false) => {
    if (!walletAddress) return;

    // Skip if already updating and not forced
    if (isUpdating && !forceUpdate) return;

    setIsUpdating(true);
    setLoading(true);
    setError(null);

    try {
      const newBalances = await fetchBalance();
      
      // Only update if values actually changed
      if (forceUpdate || newBalances.dyo !== balance || newBalances.dys !== dysBalance) {
        setBalance(newBalances.dyo);
        setUsdyoBalance(newBalances.dys);
        setLastUpdate(Date.now());
        
        console.log(`💰 Balance updated: ${newBalances.dyo} DYO, ${newBalances.dys} DYS`);
        
        // Reset retry count on success
        retryCountRef.current = 0;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error updating balance:', errorMessage);
      setError(errorMessage);
      
      // Handle retries
      retryCountRef.current++;
      if (retryCountRef.current < maxRetries) {
        console.log(`Retrying balance update in ${retryDelay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        setTimeout(() => updateBalance(true), retryDelay);
      }
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  }, [walletAddress, balance, dysBalance, fetchBalance, isUpdating, maxRetries, retryDelay]);

  // Listen for balance update requests from PlayerContext
  useEventListener('BALANCE_UPDATED', useCallback((event) => {
    console.log('🔄 useRealtimeBalance: Received BALANCE_UPDATED event:', event);
    if (event.data?.force) {
      console.log('🔄 useRealtimeBalance: Force updating balance...');
      updateBalance(true);
    } else {
      console.log('🔄 useRealtimeBalance: Regular balance update...');
      updateBalance(true);
    }
  }, [updateBalance]));

  // Start/stop polling based on player state
  const startPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const interval = getCurrentPollingInterval();
    
    // ✅ DEBUG: VER QUÉ INTERVALO SE USA REALMENTE
    console.log("🔧 [DEBUG] startPolling - Final Interval:", {
      calculatedInterval: interval,
      getCurrentPollingInterval: getCurrentPollingInterval(),
      activePollingInterval,
      inactivePollingInterval,
      isPlaying,
      hasTrack: !!currentTrack,
      timestamp: Date.now()
    });

    console.log(`🔄 Starting balance polling every ${interval}ms (player: ${isPlaying ? 'active' : 'inactive'})`);

    intervalRef.current = setInterval(() => {
      updateBalance();
    }, interval);
  }, [getCurrentPollingInterval, updateBalance, isPlaying, activePollingInterval, inactivePollingInterval, currentTrack]);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      console.log('⏹️ Stopped balance polling');
    }
  }, []);

  // Effect to manage polling based on player state
  useEffect(() => {
    if (!walletAddress) return;

    // Initial balance fetch
    updateBalance(true);

    // Start polling
    startPolling();

    return () => {
      stopPolling();
    };
  }, [walletAddress, startPolling, stopPolling, updateBalance, currentTrack, isPlaying]);

  // ✅ DEBUG EFFECT - Track player state changes
  useEffect(() => {
    console.log("🔄 useRealtimeBalance - Player State Updated:", {
      currentTrack: currentTrack ? `${currentTrack.title} (${currentTrack.id})` : 'null',
      isPlaying,
      hasTrack: !!currentTrack,
      playerActive: !!(currentTrack && isPlaying),
      timestamp: new Date().toISOString()
    });
  }, [currentTrack, isPlaying]);

  // Effect to restart polling when interval changes
  useEffect(() => {
    if (intervalRef.current) {
      startPolling();
    }
  }, [getCurrentPollingInterval, startPolling]);

  // Manual refresh function
  const refreshBalance = useCallback(async () => {
    await updateBalance(true);
  }, [updateBalance]);

  // Get total balance (DYO + DYS)
  const getTotalBalance = useCallback(() => {
    return balance + dysBalance;
  }, [balance, dysBalance]);

  // Check if balance is updating
  const isBalanceUpdating = isUpdating || loading;

  return {
    // Balance data
    balance,
    dysBalance,
    totalBalance: getTotalBalance(),
    
    // State
    loading,
    error,
    lastUpdate,
    isUpdating: isBalanceUpdating,
    
    // Actions
    refreshBalance,
    updateBalance,
    
    // Player state info
    isPlayerActive: isPlaying && !!currentTrack,
    pollingInterval: getCurrentPollingInterval()
  };
};
