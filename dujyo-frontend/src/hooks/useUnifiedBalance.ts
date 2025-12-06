import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { usePlayerContext } from '../contexts/PlayerContext';
import { getApiBaseUrl } from '../utils/apiConfig';

interface UnifiedBalanceData {
  available_dyo: number;
  dys: number;
  staked: number;
  total: number;
  pending_transactions: number;
  isUpdating: boolean;
  lastUpdate: number;
}

/**
 * Hook UNIFICADO para manejar balance en toda la app
 * Reemplaza: useRealtimeBalance, useBalanceRefresh, useAutoBalanceRefresh
 * Un solo polling, un solo estado, sin blinking
 */
export const useUnifiedBalance = () => {
  const { user } = useAuth();
  const { isPlaying, currentTrack } = usePlayerContext();
  const [balance, setBalance] = useState<UnifiedBalanceData>({
    available_dyo: 0,
    dys: 0,
    staked: 0,
    total: 0,
    pending_transactions: 0,
    isUpdating: false,
    lastUpdate: 0
  });
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const walletAddress = user?.uid;

  const fetchBalance = useCallback(async () => {
    if (!walletAddress) return;
    
    try {
      setBalance(prev => ({ ...prev, isUpdating: true }));
      
      const token = localStorage.getItem('jwt_token');
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(
        `${apiBaseUrl}/balance-detail/${walletAddress}`,
        {
          headers: token ? { 'Authorization': `Bearer ${token}` } : {}
        }
      );
      
      if (!response.ok) {
        throw new Error(`Failed to fetch balance: ${response.status}`);
      }
      
      const data = await response.json();
      
      setBalance({
        available_dyo: data.available_dyo || 0,
        dys: data.dys || 0,
        staked: data.staked || 0,
        total: data.total || 0,
        pending_transactions: data.pending_transactions || 0,
        isUpdating: false,
        lastUpdate: Date.now()
      });
      
      // Solo log si hay un cambio significativo (más de 1 DYO de diferencia)
      // Para evitar spam en consola
    } catch (error) {
      console.error('❌ Error fetching balance:', error);
      setBalance(prev => ({ ...prev, isUpdating: false }));
    }
  }, [walletAddress]);

  // ✅ Fetch inicial solo una vez - NO POLLING AUTOMÁTICO
  // El balance se actualiza SOLO cuando stream-earn/swap/stake lo piden explícitamente
  useEffect(() => {
    if (!walletAddress) return;
    fetchBalance();
  }, [walletAddress, fetchBalance]);

  // ✅ Escuchar evento personalizado de actualización de balance
  // Stream-earn, swap, stake disparan este evento cuando hay cambios
  useEffect(() => {
    const handleBalanceUpdate = (event: Event) => {
      const customEvent = event as CustomEvent;
      const earned = customEvent.detail?.earned || 0;
      const force = customEvent.detail?.force || false;
      
      // ✅ OPTIMISTIC UPDATE: If we know the earned amount, update immediately
      if (earned > 0 && customEvent.detail?.optimistic) {
        setBalance(prev => ({
          ...prev,
          available_dyo: prev.available_dyo + earned,
          total: prev.total + earned,
          lastUpdate: Date.now()
        }));
        console.log(`💰 [Optimistic] Balance updated: +${earned} DYO`);
      }
      
      // Always fetch from backend to sync (with small delay to allow DB update)
      if (force) {
        // Immediate refresh for forced updates
        setTimeout(() => fetchBalance(), 500);
      } else {
        // Normal refresh with slight delay
        setTimeout(() => fetchBalance(), 1000);
      }
    };
    
    const handleForceRefresh = () => {
      fetchBalance();
    };
    
    window.addEventListener('dujyo:balance-updated', handleBalanceUpdate);
    window.addEventListener('dujyo:force-balance-refresh', handleForceRefresh);
    
    return () => {
      window.removeEventListener('dujyo:balance-updated', handleBalanceUpdate);
      window.removeEventListener('dujyo:force-balance-refresh', handleForceRefresh);
    };
  }, [fetchBalance]);

  const refreshBalance = useCallback(() => {
    fetchBalance();
  }, [fetchBalance]);

  return {
    ...balance,
    refreshBalance
  };
};

