import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getApiBaseUrl } from '../utils/apiConfig';

export const useBalanceRefresh = (address?: string) => {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Get wallet address from multiple sources, prioritizing address prop
  const walletAddress = address || 
    localStorage.getItem('dujyo_wallet_account') ||
    (() => {
      const storedWallet = localStorage.getItem('dujyo_wallet');
      if (storedWallet) {
        try {
          const wallet = JSON.parse(storedWallet);
          return wallet.address;
        } catch (e) {
          console.warn('Error parsing dujyo_wallet:', e);
        }
      }
      return user?.uid;
    })();

  const refreshBalance = useCallback(async (): Promise<number> => {
    if (!walletAddress) {
      throw new Error('No wallet address available');
    }

    setLoading(true);
    setError(null);

    try {
      const apiBaseUrl = getApiBaseUrl();
      const balanceResponse = await fetch(`${apiBaseUrl}/balance/${walletAddress}`);

      if (!balanceResponse.ok) {
        throw new Error(`Failed to fetch balance: ${balanceResponse.status}`);
      }

      const balanceData = await balanceResponse.json();
      const newBalance = balanceData.balance || 0;

      setBalance(newBalance);
      console.log('Balance refreshed:', newBalance, 'DYO');
      return newBalance;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error refreshing balance:', errorMessage);
      setError(errorMessage);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  // Auto-refresh balance every 30 seconds
  useEffect(() => {
    if (walletAddress) {
      refreshBalance();

      const interval = setInterval(() => {
        refreshBalance().catch(err => {
          console.warn('Auto-refresh balance check failed:', err.message);
        });
      }, 30000);

      return () => clearInterval(interval);
    }
  }, [walletAddress, refreshBalance]);

  const refreshBalanceWithRetry = useCallback(async (maxRetries: number = 3): Promise<number> => {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await refreshBalance();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        console.warn(`Balance refresh attempt ${attempt}/${maxRetries} failed:`, lastError.message);
        
        if (attempt < maxRetries) {
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }
    
    throw lastError || new Error('All retry attempts failed');
  }, [refreshBalance]);

  return {
    balance,
    loading,
    error,
    refreshBalance,
    refreshBalanceWithRetry
  };
};
