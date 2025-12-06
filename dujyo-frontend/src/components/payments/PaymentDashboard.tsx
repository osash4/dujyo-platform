import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  XCircle,
  Download,
  Calendar,
  ArrowDownRight,
  Wallet,
  CreditCard,
  Building2,
  RefreshCw,
  AlertCircle,
  Shield,
  BarChart3,
  Coins,
  Zap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useUnifiedBalance } from '../../hooks/useUnifiedBalance';
import { getApiBaseUrl, getWebSocketUrl } from '../../utils/apiConfig';
import { useRetry } from '../../hooks/useRetry';
import { useCache } from '../../hooks/useCache';
import { useDebounce } from '../../hooks/useDebounce';
import { tokenPriceService, TokenPrices } from '../../services/tokenPriceService';
import WithdrawalForm from './WithdrawalForm';
import ErrorBoundary from '../ErrorBoundary';

interface PaymentDashboardProps {
  artistId?: string;
}

interface WithdrawalRecord {
  withdrawal_id: string;
  amount: number;
  currency: string;
  fee: number;
  net_amount: number;
  status: string;
  destination: string;
  created_at: string;
  completed_at?: string;
  transaction_hash?: string;
}

interface WithdrawalHistory {
  withdrawals: WithdrawalRecord[];
  total_withdrawn: number;
  pending_withdrawals: WithdrawalRecord[];
}

interface WithdrawalLimits {
  daily_limit: number;
  monthly_limit: number;
  min_amount: number;
  max_amount: number;
  kyc_required: boolean;
}

interface WithdrawalAnalytics {
  monthlyTrends: Array<{ month: string; amount: number; count: number }>;
  averageWithdrawal: number;
  totalFees: number;
  preferredCurrency: string;
}

// Loading Skeleton Component
const LoadingSkeleton: React.FC = React.memo(() => (
  <div className="space-y-4">
    {[1, 2, 3].map((i) => (
      <div key={i} className="animate-pulse">
        <div className="bg-gray-700 rounded-lg h-20"></div>
      </div>
    ))}
  </div>
));

LoadingSkeleton.displayName = 'LoadingSkeleton';

// Token Balance Card Component
const TokenBalanceCard: React.FC<{
  token: 'DYO' | 'DYS';
  balance: number;
  price: number;
  change24h: number;
  usdValue: number;
}> = React.memo(({ token, balance, price, change24h, usdValue }) => {
  const isPositive = change24h >= 0;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-gradient-to-r ${
        token === 'DYO' 
          ? 'from-amber-600 to-orange-600' 
          : 'from-purple-600 to-indigo-600'
      } p-6 rounded-xl shadow-lg`}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Coins className="w-6 h-6 text-white" />
          <h3 className="text-white font-bold text-lg">${token}</h3>
        </div>
        <div className={`flex items-center space-x-1 ${isPositive ? 'text-green-300' : 'text-red-300'}`}>
          <TrendingUp className={`w-4 h-4 ${!isPositive && 'rotate-180'}`} />
          <span className="text-sm font-semibold">{Math.abs(change24h).toFixed(2)}%</span>
        </div>
      </div>
      <div className="space-y-2">
        <div>
          <p className="text-gray-200 text-sm">Balance</p>
          <p className="text-2xl font-bold text-white">{balance.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
        </div>
        <div className="pt-2 border-t border-white/20">
          <p className="text-gray-200 text-sm">USD Value</p>
          <p className="text-xl font-semibold text-white">${usdValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</p>
          <p className="text-gray-300 text-xs mt-1">Price: ${price.toFixed(4)}</p>
        </div>
      </div>
    </motion.div>
  );
});

TokenBalanceCard.displayName = 'TokenBalanceCard';

// Withdrawal Confirmation Modal
const WithdrawalConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  amount: number;
  currency: string;
  fee: number;
  netAmount: number;
  destination: string;
  loading?: boolean;
}> = React.memo(({ isOpen, onClose, onConfirm, amount, currency, fee, netAmount, destination, loading }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gray-800 rounded-xl shadow-2xl max-w-md w-full p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-bold text-white">Confirm Withdrawal</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
              disabled={loading}
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-4 mb-6">
            <div className="bg-gray-700 p-4 rounded-lg">
              <div className="flex justify-between text-gray-300 mb-2">
                <span>Amount:</span>
                <span className="font-semibold text-white">{amount.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-gray-300 mb-2">
                <span>Fee:</span>
                <span className="font-semibold text-yellow-400">{fee.toFixed(2)} {currency}</span>
              </div>
              <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-gray-600">
                <span>You'll receive:</span>
                <span className="text-green-400">{netAmount.toFixed(2)} {currency}</span>
              </div>
            </div>
            <div className="bg-gray-700 p-4 rounded-lg">
              <p className="text-gray-300 text-sm mb-1">Destination:</p>
              <p className="text-white font-mono text-sm break-all">{destination}</p>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="btn-primary flex-1 px-6 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Processing...
                </span>
              ) : (
                'Confirm Withdrawal'
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
});

WithdrawalConfirmationModal.displayName = 'WithdrawalConfirmationModal';

const PaymentDashboard: React.FC<PaymentDashboardProps> = ({ artistId }) => {
  // ✅ Placeholder mode to avoid 404s until backend endpoints are ready
  const PAYMENTS_ENABLED = true;
  if (!PAYMENTS_ENABLED) {
    return (
      <div className="min-h-screen text-white p-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gray-800/60 border border-gray-700 rounded-xl p-6">
            <h1 className="text-2xl font-bold mb-2">Payments Dashboard</h1>
            <p className="text-gray-400 mb-4">This section is coming soon. Your earnings and withdrawals will appear here.</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm">Total Withdrawn</p>
                <p className="text-2xl font-bold text-purple-400">0.00 $DYO</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm">Pending</p>
                <p className="text-2xl font-bold text-yellow-400">0</p>
              </div>
              <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                <p className="text-gray-400 text-sm">Next Payout</p>
                <p className="text-2xl font-bold text-green-400">N/A</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
  const { user } = useAuth();
  const { available_dyo, dys, refreshBalance } = useUnifiedBalance();
  
  // State management
  const [withdrawalHistory, setWithdrawalHistory] = useState<WithdrawalHistory | null>(null);
  const [limits, setLimits] = useState<WithdrawalLimits | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWithdrawalForm, setShowWithdrawalForm] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [tokenPrices, setTokenPrices] = useState<TokenPrices | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [analytics, setAnalytics] = useState<WithdrawalAnalytics | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [pendingWithdrawalsCount, setPendingWithdrawalsCount] = useState(0);
  const [offlineMode, setOfflineMode] = useState(false);

  // Refs
  const wsRef = useRef<WebSocket | null>(null);
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Caching
  const cache = useCache<any>(5 * 60 * 1000); // 5-minute cache
  const debouncedPeriod = useDebounce(selectedPeriod, 500);

  // Simple fetch helper (single attempt)
  const fetchJson = useCallback(async (url: string, options: RequestInit = {}) => {
    const response = await fetch(url, options);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      const statusText = response.statusText || text || 'Error';
      throw new Error(`HTTP ${response.status}: ${statusText}`);
    }
    return response.json();
  }, []);

  // Fetch withdrawal history with caching and retry
  const fetchWithdrawalHistory = useCallback(async (forceRefresh: boolean = false) => {
    const cacheKey = `withdrawal-history-${user?.uid || artistId}-${selectedPeriod}`;
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        setWithdrawalHistory(cached);
        return;
      }
    }

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiBaseUrl = getApiBaseUrl();
      const userId = artistId || user?.uid;
      const data = await fetchJson(`${apiBaseUrl}/api/v1/payments/withdrawals?period=${selectedPeriod}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      setWithdrawalHistory(data);
      cache.set(cacheKey, data);
      setError(null);
      setOfflineMode(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch withdrawal history';
      setError(errorMessage);
      console.error('Error fetching withdrawal history:', err);
      
      // Try to use cached data if available
      const cached = cache.get(cacheKey);
      if (cached) {
        setWithdrawalHistory(cached);
        setOfflineMode(true);
      }
    }
  }, [user?.uid, artistId, selectedPeriod, cache, fetchJson]);

  // Fetch limits with caching
  const fetchLimits = useCallback(async (forceRefresh: boolean = false) => {
    const cacheKey = 'withdrawal-limits';
    
    if (!forceRefresh) {
      const cached = cache.get(cacheKey);
      if (cached) {
        setLimits(cached);
        return;
      }
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('jwt_token');
      const data = await fetchWithRetry(`${apiBaseUrl}/api/v1/payments/limits`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : undefined
      });
      
      setLimits(data);
      cache.set(cacheKey, data);
      setError(null);
      setOfflineMode(false);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch withdrawal limits';
      setError(errorMessage);
      console.error('Error fetching limits:', err);
      
      const cached = cache.get(cacheKey);
      if (cached) {
        setLimits(cached);
        setOfflineMode(true);
      }
    }
  }, [cache, fetchWithRetry]);

  // Fetch token prices
  const fetchTokenPrices = useCallback(async () => {
    try {
      const prices = await tokenPriceService.getTokenPrices();
      setTokenPrices(prices);
    } catch (err) {
      console.error('Error fetching token prices:', err);
    }
  }, []);

  // Fetch analytics
  const fetchAnalytics = useCallback(async () => {
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) return;

      const apiBaseUrl = getApiBaseUrl();
      const userId = artistId || user?.uid;
      const response = await fetch(`${apiBaseUrl}/api/v1/payments/analytics`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setAnalytics(data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    }
  }, [user?.uid, artistId]);

  // WebSocket connection for real-time updates
  useEffect(() => {
    const walletAddress = artistId || user?.uid;
    if (!walletAddress) return;

    try {
      const wsUrl = getWebSocketUrl();
      const ws = new WebSocket(`${wsUrl}/payments?wallet=${walletAddress}`);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Payment WebSocket connected');
        setWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          
          if (data.type === 'withdrawal_update') {
            // Refresh withdrawal history
            fetchWithdrawalHistory(true);
            refreshBalance();
          } else if (data.type === 'balance_update') {
            refreshBalance();
          } else if (data.type === 'withdrawal_status') {
            // Update specific withdrawal status
            setWithdrawalHistory((prev) => {
              if (!prev) return prev;
              return {
                ...prev,
                withdrawals: prev.withdrawals.map((w) =>
                  w.withdrawal_id === data.withdrawal_id
                    ? { ...w, status: data.status, transaction_hash: data.tx_hash }
                    : w
                ),
              };
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setWsConnected(false);
      };

      ws.onclose = () => {
        console.log('WebSocket connection closed');
        setWsConnected(false);
        
        // Attempt to reconnect after 5 seconds
        retryTimeoutRef.current = setTimeout(() => {
          if (wsRef.current?.readyState === WebSocket.CLOSED) {
            // Reconnection will be handled by the useEffect
          }
        }, 5000);
      };

      return () => {
        if (retryTimeoutRef.current) {
          clearTimeout(retryTimeoutRef.current);
        }
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
    }
  }, [user?.uid, artistId, fetchWithdrawalHistory, refreshBalance]);

  // Polling for pending withdrawals (fallback if WebSocket fails)
  useEffect(() => {
    if (wsConnected) return; // Don't poll if WebSocket is connected

    const pollPendingWithdrawals = async () => {
      if (withdrawalHistory?.pending_withdrawals.length) {
        await fetchWithdrawalHistory(true);
      }
    };

    pollingIntervalRef.current = setInterval(pollPendingWithdrawals, 30000); // Poll every 30 seconds

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, [wsConnected, withdrawalHistory?.pending_withdrawals.length, fetchWithdrawalHistory]);

  // Initial data fetch
  useEffect(() => {
    if (user?.uid || artistId) {
      setLoading(true);
      Promise.all([
        fetchWithdrawalHistory(),
        fetchLimits(),
        fetchTokenPrices(),
        fetchAnalytics(),
      ]).finally(() => {
        setLoading(false);
      });
    }
  }, [user?.uid, artistId]);

  // Refresh when period changes (debounced) - avoid double call on first mount
  const firstPeriodChangeRef = useRef(true);
  useEffect(() => {
    if (!user?.uid && !artistId) return;
    if (firstPeriodChangeRef.current) {
      firstPeriodChangeRef.current = false;
      return; // skip initial to prevent duplicate with initial fetch
    }
    fetchWithdrawalHistory(true);
  }, [debouncedPeriod, user?.uid, artistId, fetchWithdrawalHistory]);

  // Update pending withdrawals count
  useEffect(() => {
    if (withdrawalHistory) {
      setPendingWithdrawalsCount(withdrawalHistory.pending_withdrawals.length);
    }
  }, [withdrawalHistory]);

  // Refresh token prices periodically
  useEffect(() => {
    const interval = setInterval(fetchTokenPrices, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [fetchTokenPrices]);

  // Pull-to-refresh handler
  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    cache.clear(); // Clear cache for fresh data
    await Promise.all([
      fetchWithdrawalHistory(true),
      fetchLimits(true),
      fetchTokenPrices(),
      refreshBalance(),
    ]);
    setIsRefreshing(false);
  }, [cache, fetchWithdrawalHistory, fetchLimits, fetchTokenPrices, refreshBalance]);

  // Format currency with token conversion
  const formatCurrency = useCallback((amount: number, currency: string = 'USD') => {
    if (currency === 'DYO' && tokenPrices) {
      const usdValue = amount * tokenPrices.dyo;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(usdValue);
    } else if (currency === 'DYS' && tokenPrices) {
      const usdValue = amount * tokenPrices.dys;
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(usdValue);
    }
    
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency === 'DYO' ? 'USD' : currency === 'DYS' ? 'USD' : currency,
    }).format(amount);
  }, [tokenPrices]);

  // Memoized computed values
  const dyoUsdValue = useMemo(() => {
    if (!tokenPrices) return 0;
    return available_dyo * tokenPrices.dyo;
  }, [available_dyo, tokenPrices]);

  const dysUsdValue = useMemo(() => {
    if (!tokenPrices) return 0;
    return dys * tokenPrices.dys;
  }, [dys, tokenPrices]);

  const totalUsdValue = useMemo(() => {
    return dyoUsdValue + dysUsdValue;
  }, [dyoUsdValue, dysUsdValue]);

  const getStatusIcon = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'pending':
      case 'processing':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      case 'failed':
      case 'cancelled':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'pending':
      case 'processing':
        return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'failed':
      case 'cancelled':
        return 'bg-red-500/20 text-red-400 border-red-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  }, []);

  if (loading && !withdrawalHistory) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <Loader2 className="w-12 h-12 animate-spin text-purple-500 mx-auto mb-4" />
            <p className="text-gray-400">Loading payment dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="p-6 space-y-6">
        {/* Header with refresh and status */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-3xl font-bold text-white">Payment Dashboard</h1>
              {wsConnected && (
                <div className="flex items-center space-x-1 text-green-400">
                  <Zap className="w-4 h-4" />
                  <span className="text-xs">Live</span>
                </div>
              )}
              {offlineMode && (
                <div className="flex items-center space-x-1 text-yellow-400">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-xs">Offline</span>
                </div>
              )}
            </div>
            <p className="text-gray-400 mt-1">Manage your earnings and withdrawals</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="btn-secondary px-4 py-2 flex items-center space-x-2 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
            <button
              onClick={() => setShowWithdrawalForm(true)}
              className="btn-primary px-6 py-3 flex items-center space-x-2"
            >
              <ArrowDownRight className="w-5 h-5" />
              <span>New Withdrawal</span>
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center space-x-3"
          >
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-400 font-semibold">Error</p>
              <p className="text-red-300 text-sm">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-300"
            >
              <XCircle className="w-5 h-5" />
            </button>
          </motion.div>
        )}

        {/* Token Balance Cards */}
        {tokenPrices && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <TokenBalanceCard
              token="DYO"
              balance={available_dyo}
              price={tokenPrices.dyo}
              change24h={tokenPrices.dyoChange24h}
              usdValue={dyoUsdValue}
            />
            <TokenBalanceCard
              token="DYS"
              balance={dys}
              price={tokenPrices.dys}
              change24h={tokenPrices.dysChange24h}
              usdValue={dysUsdValue}
            />
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Total Withdrawn</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {withdrawalHistory ? formatCurrency(withdrawalHistory.total_withdrawn) : '$0.00'}
                </p>
              </div>
              <DollarSign className="w-12 h-12 text-green-200" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-orange-600 to-blue-700 p-6 rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Pending Withdrawals</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {pendingWithdrawalsCount}
                </p>
              </div>
              <Clock className="w-12 h-12 text-blue-200" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Daily Limit</p>
                <p className="text-3xl font-bold text-white mt-2">
                  {limits ? formatCurrency(limits.daily_limit) : '$0.00'}
                </p>
              </div>
              <TrendingUp className="w-12 h-12 text-purple-200" />
            </div>
          </motion.div>
        </div>

        {/* Withdrawal Limits Info */}
        {limits && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 p-6 rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Withdrawal Limits</h3>
              {limits.kyc_required && (
                <div className="flex items-center space-x-2 text-yellow-400">
                  <Shield className="w-5 h-5" />
                  <span className="text-sm font-medium">KYC Required</span>
                </div>
              )}
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Minimum</p>
                <p className="text-white font-semibold">{formatCurrency(limits.min_amount)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Maximum</p>
                <p className="text-white font-semibold">{formatCurrency(limits.max_amount)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Daily Limit</p>
                <p className="text-white font-semibold">{formatCurrency(limits.daily_limit)}</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Monthly Limit</p>
                <p className="text-white font-semibold">{formatCurrency(limits.monthly_limit)}</p>
              </div>
            </div>
          </motion.div>
        )}

        {/* Analytics Section */}
        {analytics && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 p-6 rounded-xl shadow-lg"
          >
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className="flex items-center justify-between w-full mb-4"
            >
              <div className="flex items-center space-x-2">
                <BarChart3 className="w-5 h-5 text-purple-400" />
                <h3 className="text-xl font-bold text-white">Withdrawal Analytics</h3>
              </div>
              {showAnalytics ? (
                <ChevronUp className="w-5 h-5 text-gray-400" />
              ) : (
                <ChevronDown className="w-5 h-5 text-gray-400" />
              )}
            </button>
            
            {showAnalytics && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Average Withdrawal</p>
                    <p className="text-white font-bold text-xl">{formatCurrency(analytics.averageWithdrawal)}</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Total Fees Paid</p>
                    <p className="text-white font-bold text-xl">{formatCurrency(analytics.totalFees)}</p>
                  </div>
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <p className="text-gray-400 text-sm">Preferred Currency</p>
                    <p className="text-white font-bold text-xl">{analytics.preferredCurrency}</p>
                  </div>
                </div>
                
                {analytics.monthlyTrends.length > 0 && (
                  <div className="bg-gray-700 p-4 rounded-lg">
                    <h4 className="text-white font-semibold mb-2">Monthly Trends</h4>
                    <div className="space-y-2">
                      {analytics.monthlyTrends.slice(0, 6).map((trend, idx) => (
                        <div key={idx} className="flex items-center justify-between">
                          <span className="text-gray-300 text-sm">{trend.month}</span>
                          <div className="flex items-center space-x-4">
                            <span className="text-white text-sm">{trend.count} withdrawals</span>
                            <span className="text-green-400 font-semibold">{formatCurrency(trend.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Withdrawal History */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gray-800 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between mb-4 flex-wrap gap-4">
            <h3 className="text-xl font-bold text-white">Withdrawal History</h3>
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value as any)}
              className="bg-gray-700 text-white px-4 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
          </div>

          {loading && !withdrawalHistory ? (
            <LoadingSkeleton />
          ) : withdrawalHistory && withdrawalHistory.withdrawals.length > 0 ? (
            <div className="space-y-4">
              {withdrawalHistory.withdrawals.map((withdrawal) => (
                <motion.div
                  key={withdrawal.withdrawal_id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className={`p-4 rounded-lg border ${getStatusColor(withdrawal.status)}`}
                >
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(withdrawal.status)}
                      <div>
                        <p className="text-white font-semibold">
                          {formatCurrency(withdrawal.amount, withdrawal.currency)}
                        </p>
                        <p className="text-gray-400 text-sm">
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-white font-semibold">
                        Net: {formatCurrency(withdrawal.net_amount, withdrawal.currency)}
                      </p>
                      <p className="text-gray-400 text-sm">
                        Fee: {formatCurrency(withdrawal.fee, withdrawal.currency)}
                      </p>
                      {withdrawal.transaction_hash && (
                        <a
                          href={`#tx/${withdrawal.transaction_hash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400 hover:text-purple-300 text-xs mt-1 flex items-center space-x-1"
                        >
                          <span>TX: {withdrawal.transaction_hash.substring(0, 10)}...</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Wallet className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No withdrawals yet</p>
              <p className="text-gray-500 text-sm mt-2">
                Start by creating your first withdrawal
              </p>
              <button
                onClick={() => setShowWithdrawalForm(true)}
                className="btn-primary mt-4 px-6 py-2"
              >
                Create Withdrawal
              </button>
            </div>
          )}
        </motion.div>

        {/* Withdrawal Form Modal */}
        {showWithdrawalForm && (
          <WithdrawalForm
            onClose={() => setShowWithdrawalForm(false)}
            onSuccess={() => {
              setShowWithdrawalForm(false);
              handleRefresh();
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default React.memo(PaymentDashboard);
