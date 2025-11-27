import { useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useBalanceRefresh } from './useBalanceRefresh';

interface UseAutoBalanceRefreshProps {
  onBalanceUpdate?: (newBalance: number, previousBalance: number) => void;
  intervalMs?: number;
  enabled?: boolean;
}

export const useAutoBalanceRefresh = ({
  onBalanceUpdate,
  intervalMs = 10000, // 10 seconds
  enabled = true
}: UseAutoBalanceRefreshProps = {}) => {
  const { user } = useAuth();
  const { refreshBalance } = useBalanceRefresh();
  const previousBalanceRef = useRef<number>(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!enabled || !user?.uid) {
      return;
    }

    const startAutoRefresh = async () => {
      // Get initial balance
      try {
        const initialBalance = await refreshBalance();
        previousBalanceRef.current = initialBalance;
      } catch (error) {
        console.warn('Failed to get initial balance for auto-refresh:', error);
      }

      // Set up interval
      intervalRef.current = setInterval(async () => {
        try {
          const newBalance = await refreshBalance();
          const previousBalance = previousBalanceRef.current;
          
          if (newBalance !== previousBalance) {
            console.log('Auto-refresh detected balance change:', {
              previous: previousBalance,
              new: newBalance,
              difference: newBalance - previousBalance
            });
            
            previousBalanceRef.current = newBalance;
            onBalanceUpdate?.(newBalance, previousBalance);
          }
        } catch (error) {
          console.warn('Auto-refresh balance check failed:', error);
        }
      }, intervalMs);
    };

    startAutoRefresh();

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, user?.uid, refreshBalance, onBalanceUpdate, intervalMs]);

  return {
    isEnabled: enabled,
    intervalMs
  };
};
