import React, { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useBlockchain } from '../../contexts/BlockchainContext';
import { useAuth } from '../../auth/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { WalletBalance } from './WalletBalance';
import { NFTGallery } from '../nft/NFTGalery';
import { TransactionHistory } from './TransactionHistory';
import { NFTTransferModal } from '../nft/NFTTransferModal';
import { FilterPanel } from '../common/FilterPanel';
import { Spinner } from '../common/Spinner';
import { format, isThisWeek, isThisMonth } from 'date-fns';
import { 
  Wallet, TrendingUp, TrendingDown, Activity, 
  Coins, ArrowUpRight, ArrowDownLeft, RefreshCw,
  AlertCircle, CheckCircle, Zap, Music, Video, Gamepad2,
  Upload, Users, Target, Award, Sparkles, Info, Clock,
  BarChart3, ExternalLink, Flame, Star, Trophy
} from 'lucide-react';

type BalancesPallet = {
  getBalance: (account: string) => Promise<number>;
  getTransactionHistory: (account: string) => Promise<Transaction[]>;
};

type NFTPallet = {
  getTokensByOwner: (account: string) => Promise<NFT[]>;
  transferNFT: (from: string, to: string, nftId: string) => Promise<void>;
};

type Transaction = {
  hash: string;
  type: string;
  amount: number;
  timestamp: string | number;
  from?: string;
  to?: string;
  created_at?: string;
};

type NFT = {
  id: string | null | undefined;
  imageUrl: string;
  name: string | null | undefined;
};

type FilterOption = {
  type: string;
  dateRange: string;
  amount: string;
};

interface PlatformEarnings {
  platform: 'music' | 'video' | 'gaming';
  earnings: number;
  streams: number;
  views?: number;
  plays?: number;
  label: string;
  icon: React.ElementType;
  color: string;
}

interface EarningPrediction {
  period: 'weekly' | 'monthly';
  predicted: number;
  confidence: number;
  basedOn: string;
}

interface EarningAchievement {
  id: string;
  title: string;
  description: string;
  progress: number;
  target: number;
  reward: number;
  completed: boolean;
  icon: React.ElementType;
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  potentialEarnings: string;
  link: string;
  icon: React.ElementType;
  color: string;
}

export function WalletDashboard() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const { account, balancesPallet, nftPallet, currentBalance, lastBalanceUpdate } = useBlockchain() as {
    account: string | null;
    balancesPallet: BalancesPallet;
    nftPallet: NFTPallet;
    currentBalance: number;
    lastBalanceUpdate: number;
  };
  const { user, getUserRole } = useAuth();

  const [balance, setBalance] = useState<number>(0);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedNFT, setSelectedNFT] = useState<NFT | null>(null);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [filters, setFilters] = useState<FilterOption>({
    type: 'all',
    dateRange: 'all',
    amount: 'all',
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  
  // Stream-to-Earn state
  const [platformEarnings, setPlatformEarnings] = useState<PlatformEarnings[]>([]);
  const [totalStreamingEarnings, setTotalStreamingEarnings] = useState(0);
  const [currentSessionEarnings, setCurrentSessionEarnings] = useState(0);
  const [earningPredictions, setEarningPredictions] = useState<EarningPrediction[]>([]);
  const [nextPayoutDate, setNextPayoutDate] = useState<Date | null>(null);
  const [nextPayoutAmount, setNextPayoutAmount] = useState(0);
  const [achievements, setAchievements] = useState<EarningAchievement[]>([]);
  const [earningHistory, setEarningHistory] = useState<any[]>([]);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);

  // Sync local balance with real-time balance from context
  useEffect(() => {
    if (currentBalance !== balance) {
      console.log(`🔄 WalletDashboard: Balance updated from ${balance} to ${currentBalance} DYO`);
      setBalance(currentBalance);
    }
  }, [currentBalance, lastBalanceUpdate]);

  // Get wallet address from multiple sources if account is not set
  useEffect(() => {
    if (!account) {
      const walletAccount = localStorage.getItem('dujyo_wallet_account');
      if (walletAccount) {
        console.log('🔍 WalletDashboard: Found wallet in localStorage:', walletAccount);
      } else {
        const storedWallet = localStorage.getItem('dujyo_wallet');
        if (storedWallet) {
          try {
            const wallet = JSON.parse(storedWallet);
            if (wallet.address) {
              console.log('🔍 WalletDashboard: Found wallet address in dujyo_wallet:', wallet.address);
            }
          } catch (e) {
            console.warn('Error parsing dujyo_wallet:', e);
          }
        }
      }
    }
  }, [account]);

  // Fetch Stream-to-Earn earnings data
  useEffect(() => {
    if (walletAddress || account) {
      fetchStreamingEarnings();
      fetchEarningPredictions();
      fetchAchievements();
      fetchEarningHistory();
    }
  }, [walletAddress, account]);

  const fetchStreamingEarnings = async () => {
    setIsLoadingEarnings(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = account || walletAddress || user?.email || '';
      const userRole = getUserRole();
      
      const endpoint = userRole === 'artist' 
        ? `/api/earnings/artist/${userId}`
        : `/api/earnings/user/${userId}`;
      
      const response = await fetch(`${apiBaseUrl}${endpoint}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        
        // Platform breakdown
        const platforms: PlatformEarnings[] = [
          {
            platform: 'music',
            earnings: data.musicEarnings || 0,
            streams: data.musicStreams || 0,
            label: t('wallet.music'),
            icon: Music,
            color: '#F59E0B'
          },
          {
            platform: 'video',
            earnings: data.videoEarnings || 0,
            streams: data.videoViews || 0,
            views: data.videoViews || 0,
            label: t('wallet.video'),
            icon: Video,
            color: '#00F5FF'
          },
          {
            platform: 'gaming',
            earnings: data.gamingEarnings || 0,
            streams: data.gamingPlays || 0,
            plays: data.gamingPlays || 0,
            label: t('wallet.gaming'),
            icon: Gamepad2,
            color: '#10B981'
          }
        ];
        
        setPlatformEarnings(platforms);
        setTotalStreamingEarnings(data.totalEarnings || 0);
        setCurrentSessionEarnings(data.sessionEarnings || 0);
        setNextPayoutDate(data.nextPayoutDate ? new Date(data.nextPayoutDate) : null);
        setNextPayoutAmount(data.nextPayoutAmount || 0);
      }
    } catch (error) {
      console.error('Error fetching streaming earnings:', error);
    } finally {
      setIsLoadingEarnings(false);
    }
  };

  const fetchEarningPredictions = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = account || walletAddress || user?.email || '';
      
      const response = await fetch(`${apiBaseUrl}/api/earnings/predictions/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEarningPredictions([
          {
            period: 'weekly',
            predicted: data.weeklyPrediction || 0,
            confidence: data.weeklyConfidence || 75,
            basedOn: t('wallet.currentActivityTrends')
          },
          {
            period: 'monthly',
            predicted: data.monthlyPrediction || 0,
            confidence: data.monthlyConfidence || 80,
            basedOn: t('wallet.historicalPatterns')
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching predictions:', error);
    }
  };

  const fetchAchievements = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = account || walletAddress || user?.email || '';
      
      const response = await fetch(`${apiBaseUrl}/api/achievements/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAchievements(data.achievements || []);
      } else {
        // Default achievements
        setAchievements([
          {
            id: 'top-earner',
            title: t('wallet.top10PercentEarner'),
            description: t('wallet.beTop10PercentEarners'),
            progress: 75,
            target: 100,
            reward: 500,
            completed: false,
            icon: Trophy
          },
          {
            id: 'consistent-creator',
            title: t('wallet.consistentCreator'),
            description: t('wallet.uploadContent30Days'),
            progress: 20,
            target: 30,
            reward: 250,
            completed: false,
            icon: Star
          },
          {
            id: 'first-earnings',
            title: t('wallet.firstEarnings'),
            description: t('wallet.earnYourFirstDyo'),
            progress: 100,
            target: 100,
            reward: 50,
            completed: true,
            icon: Award
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching achievements:', error);
    }
  };

  const fetchEarningHistory = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = account || walletAddress || user?.email || '';
      
      const response = await fetch(`${apiBaseUrl}/api/earnings/history/${userId}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setEarningHistory(data.history || []);
      }
    } catch (error) {
      console.error('Error fetching earning history:', error);
    }
  };

  async function loadWalletData() {
    setLoading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      let walletAddress = account;
      
      if (!walletAddress) {
        walletAddress = localStorage.getItem('dujyo_wallet_account');
      }
      
      if (!walletAddress) {
        const storedWallet = localStorage.getItem('dujyo_wallet');
        if (storedWallet) {
          try {
            const wallet = JSON.parse(storedWallet);
            walletAddress = wallet.address;
          } catch (e) {
            console.warn('Error parsing dujyo_wallet:', e);
          }
        }
      }

      if (!walletAddress) {
        setError('No se ha detectado una billetera conectada.');
        setLoading(false);
        return;
      }

      if (!balancesPallet || !nftPallet) {
        throw new Error('Los pallets de blockchain no están disponibles.');
      }

      const token = localStorage.getItem('jwt_token');
      let userBalance = 0;

      if (token) {
        try {
          const apiBaseUrl = getApiBaseUrl();
          const balanceResponse = await fetch(`${apiBaseUrl}/balance/${walletAddress}`, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          
          if (balanceResponse.ok) {
            const balanceData = await balanceResponse.json();
            userBalance = balanceData.balance;
            console.log('Wallet balance loaded from backend:', userBalance);
          } else {
            throw new Error('Backend balance fetch failed');
          }
        } catch (backendError) {
          console.warn('Backend balance fetch failed, falling back to balancesPallet:', backendError);
          userBalance = await balancesPallet.getBalance(walletAddress);
        }
      } else {
        userBalance = await balancesPallet.getBalance(walletAddress);
      }

      const [userNFTs, txHistory] = await Promise.all([
        nftPallet.getTokensByOwner(walletAddress),
        balancesPallet.getTransactionHistory(walletAddress),
      ]);

      setBalance(userBalance);
      setNfts(userNFTs);
      // Filtrar transacciones inválidas antes de establecerlas
      const validTransactions = (txHistory || []).filter((tx: Transaction) => 
        tx != null && 
        typeof tx === 'object' && 
        tx.hash && 
        tx.type && 
        typeof tx.type === 'string'
      );
      setTransactions(validTransactions);
      
      // Refresh earnings data
      await fetchStreamingEarnings();
    } catch (err: any) {
      setError(err.message || 'Error al cargar los datos de la billetera.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  // Get wallet address from multiple sources
  useEffect(() => {
    let currentWalletAddress = account;
    
    if (!currentWalletAddress) {
      currentWalletAddress = localStorage.getItem('dujyo_wallet_account');
    }
    
    if (!currentWalletAddress) {
      const storedWallet = localStorage.getItem('dujyo_wallet');
      if (storedWallet) {
        try {
          const wallet = JSON.parse(storedWallet);
          currentWalletAddress = wallet.address;
        } catch (e) {
          console.warn('Error parsing dujyo_wallet:', e);
        }
      }
    }

    if (currentWalletAddress) {
      setWalletAddress(currentWalletAddress);
      console.log('✅ WalletDashboard: Wallet address set to:', currentWalletAddress);
    } else {
      setWalletAddress(null);
      setError('No se ha detectado una billetera conectada.');
      setLoading(false);
    }
  }, [account]);

  // Load wallet data when walletAddress is available
  useEffect(() => {
    if (walletAddress) {
      loadWalletData();
      
      const interval = setInterval(() => {
        loadWalletData();
      }, 30000);
      
      return () => clearInterval(interval);
    }
  }, [walletAddress]);

  const filteredTransactions = useMemo(() => {
    if (!Array.isArray(transactions)) return [];
    return transactions.filter((tx): tx is Transaction => {
      // Type guard robusto
      if (!tx || typeof tx !== 'object') return false;
      if (!tx.hash || typeof tx.hash !== 'string') return false;
      if (!tx.type || typeof tx.type !== 'string') return false;
      
      const matchesSearch = tx.hash.includes(searchQuery) || (tx.type && tx.type.includes(searchQuery));
      const matchesType = filters.type === 'all' || tx.type === filters.type;
      const matchesAmount =
        filters.amount === 'all' ||
        (filters.amount === 'high' ? (tx.amount || 0) > 1000 : (tx.amount || 0) <= 1000);
      const matchesDate =
        filters.dateRange === 'all' ||
        (tx.timestamp && (
          (filters.dateRange === 'today' && isToday(tx.timestamp)) ||
          (filters.dateRange === 'week' && isThisWeek(new Date(tx.timestamp))) ||
          (filters.dateRange === 'month' && isThisMonth(new Date(tx.timestamp)))
        ));

      return matchesSearch && matchesType && matchesAmount && matchesDate;
    });
  }, [transactions, searchQuery, filters]);

  const isToday = (timestamp: string) => {
    const date = new Date(timestamp);
    return format(date, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd');
  };

  const handleNFTTransfer = async (toAddress: string) => {
    if (selectedNFT && selectedNFT.id && walletAddress) {
      try {
        await nftPallet.transferNFT(walletAddress, toAddress, selectedNFT.id);
        await loadWalletData();
        setIsTransferModalOpen(false);
        setSelectedNFT(null);
        setSuccessMessage(t('wallet.nftTransferredSuccessfully'));
      } catch (err: any) {
        setError(t('wallet.nftTransferError'));
        console.error(err);
      }
    }
  };

  const quickActions: QuickAction[] = React.useMemo(() => [
    {
      id: 'upload',
      title: t('wallet.uploadContent'),
      description: t('wallet.startEarningFromCreations'),
      potentialEarnings: '+50 $DYO/week',
      link: '/upload',
      icon: Upload,
      color: '#F59E0B'
    },
    {
      id: 'engage',
      title: t('wallet.engageCommunity'),
      description: t('wallet.interactWithCreatorsAndFans'),
      potentialEarnings: '+25 $DYO/week',
      link: '/profile',
      icon: Users,
      color: '#FBBF24'
    },
    {
      id: 'quests',
      title: t('wallet.completeQuests'),
      description: t('wallet.finishDailyChallenges'),
      potentialEarnings: '+15 $DYO/week',
      link: '/gaming',
      icon: Target,
      color: '#EA580C'
    }
  ], [t]);

  const tokenUtilities = React.useMemo(() => [
    {
      title: t('wallet.stakeEarn'),
      description: t('wallet.stakeDyoTokens'),
      link: '/staking',
      icon: TrendingUp,
      color: '#F59E0B'
    },
    {
      title: t('wallet.tradeOnDex'),
      description: t('wallet.swapDyoForTokens'),
      link: '/dex',
      icon: ArrowUpRight,
      color: '#FBBF24'
    },
    {
      title: t('wallet.buyNfts'),
      description: t('wallet.purchaseExclusiveNfts'),
      link: '/marketplace',
      icon: Sparkles,
      color: '#EA580C'
    },
    {
      title: t('wallet.premiumFeatures'),
      description: t('wallet.unlockAdvancedFeatures'),
      link: '/profile',
      icon: Star,
      color: '#00F5FF'
    }
  ], [t]);

  const walletStats = React.useMemo(() => [
    { 
      label: t('wallet.totalBalance'), 
      value: `${balance.toFixed(4)} $DYO`, 
      icon: Wallet, 
      color: "#F59E0B",
      change: "+5.2%",
      changeType: "positive" as const
    },
    { 
      label: t('wallet.streamingEarnings'), 
      value: `${totalStreamingEarnings.toFixed(2)} $DYO`, 
      icon: Coins, 
      color: "#FBBF24",
      change: `+${currentSessionEarnings.toFixed(2)}`,
      changeType: "positive" as const
    },
    { 
      label: t('wallet.nftsOwned'), 
      value: nfts.length.toString(), 
      icon: Sparkles, 
      color: "#EA580C",
      change: "+2",
      changeType: "positive" as const
    },
    { 
      label: t('wallet.transactions'), 
      value: transactions.length.toString(), 
      icon: Activity, 
      color: "#00F5FF",
      change: "+12",
      changeType: "positive" as const
    }
  ], [t, balance, totalStreamingEarnings, nfts.length, transactions.length, currentSessionEarnings]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
            <Wallet size={28} className="text-amber-400" />
            {t('wallet.walletDashboard')}
          </h2>
          <p className="text-gray-400 text-sm mt-1">
            {t('wallet.manageDigitalAssets')}
          </p>
        </div>
        <motion.button
          onClick={loadWalletData}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700/50 hover:bg-gray-600/50 rounded-lg text-white transition-all duration-300 min-h-[44px]"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          disabled={loading}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          <span>{t('common.refresh')}</span>
        </motion.button>
      </div>

      {/* Status Messages */}
      {error && (
        <motion.div
          className="flex items-center gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <AlertCircle size={20} />
          <span>{error}</span>
        </motion.div>
      )}
      
      {successMessage && (
        <motion.div
          className="flex items-center gap-3 p-4 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <CheckCircle size={20} />
          <span>{successMessage}</span>
        </motion.div>
      )}

      {loading && (
        <div className="flex items-center justify-center py-12">
          <motion.div
            className="flex items-center gap-3 text-gray-400"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <RefreshCw size={24} className="animate-spin" />
            <span>{t('wallet.loadingWalletData')}</span>
          </motion.div>
        </div>
      )}

      {!loading && !error && (
        <>
          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {walletStats.map((stat, index) => {
              const Icon = stat.icon;
              return (
                <motion.div
                  key={stat.label}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-700/50 shadow-lg"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02 }}
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-3 rounded-lg" style={{ backgroundColor: `${stat.color}20` }}>
                      <Icon size={24} style={{ color: stat.color }} />
                    </div>
                    <div className={`flex items-center gap-1 text-sm font-medium ${
                      stat.changeType === 'positive' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {stat.changeType === 'positive' ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                      <span>{stat.change}</span>
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-white mb-1">{stat.value}</p>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                </motion.div>
              );
            })}
          </div>

          {/* Real-Time Session Earnings */}
          {currentSessionEarnings > 0 && (
            <motion.div
              className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-xl p-4 md:p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-500/20 rounded-lg">
                    <Zap className="w-6 h-6 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-400">{t('wallet.currentSessionEarnings')}</p>
                    <p className="text-2xl font-bold text-amber-400">{currentSessionEarnings.toFixed(2)} $DYO</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Clock className="w-4 h-4" />
                  <span>{t('wallet.liveUpdates')}</span>
                </div>
              </div>
            </motion.div>
          )}

          {/* Streaming Earnings Breakdown by Platform */}
          <motion.div
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-700/50 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <BarChart3 className="w-6 h-6 text-amber-400" />
                {t('wallet.streamingEarningsBreakdown')}
              </h3>
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Coins className="w-4 h-4 text-amber-400" />
                <span>{t('common.total')}: {totalStreamingEarnings.toFixed(2)} $DYO</span>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {(platformEarnings || []).filter(platform => platform && platform.platform).map((platform, idx) => {
                if (!platform || !platform.icon) return null;
                const PlatformIcon = platform.icon;
                return (
                  <motion.div
                    key={platform.platform || idx}
                    className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.5, delay: 0.3 + idx * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${platform.color || '#F59E0B'}20` }}>
                        <PlatformIcon className="w-5 h-5" style={{ color: platform.color || '#F59E0B' }} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white">{platform.label || 'Unknown'}</h4>
                        <p className="text-2xl font-bold" style={{ color: platform.color || '#F59E0B' }}>
                          {(platform.earnings || 0).toFixed(2)} $DYO
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs text-gray-400">
                      <div className="flex justify-between">
                        <span>{t('wallet.streamsViewsPlays')}:</span>
                        <span className="text-white">{formatNumber(platform.streams || 0)}</span>
                      </div>
                      <div className="w-full bg-gray-600 rounded-full h-1.5">
                        <motion.div
                          className="h-1.5 rounded-full"
                          style={{ backgroundColor: platform.color }}
                          initial={{ width: 0 }}
                          animate={{ width: `${(platform.earnings / totalStreamingEarnings) * 100}%` }}
                          transition={{ duration: 0.5 }}
                        />
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Earning Predictions & Insights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-700/50 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-amber-400" />
                {t('wallet.earningPredictions')}
              </h3>
              <div className="space-y-4">
                {earningPredictions.map((prediction, idx) => (
                  <div key={prediction.period} className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-300 capitalize">{prediction.period} Prediction</span>
                      <span className="text-xs text-gray-400">{prediction.confidence}% confidence</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-400 mb-1">{prediction.predicted.toFixed(2)} $DYO</p>
                    <p className="text-xs text-gray-400">{prediction.basedOn}</p>
                  </div>
                ))}
              </div>
            </motion.div>

            <motion.div
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-700/50 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.5 }}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-400" />
                Next Payout
              </h3>
              {nextPayoutDate ? (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Estimated Payout</p>
                    <p className="text-3xl font-bold text-amber-400">{nextPayoutAmount.toFixed(2)} $DYO</p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-400">
                    <Clock className="w-4 h-4" />
                    <span>Next payout: {format(nextPayoutDate, 'MMM dd, yyyy')}</span>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-sm">
                  <p>Payout schedule will be available after your first earnings.</p>
                </div>
              )}
            </motion.div>
          </div>

          {/* Quick Actions for Earning Boost */}
          <motion.div
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-700/50 shadow-lg"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.6 }}
          >
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              Boost Your Earnings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {quickActions.map((action, idx) => {
                const ActionIcon = action.icon;
                return (
                  <motion.button
                    key={action.id}
                    onClick={() => navigate(action.link)}
                    className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/50 hover:border-amber-400/50 transition-all text-left"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.7 + idx * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${action.color}20` }}>
                        <ActionIcon className="w-5 h-5" style={{ color: action.color }} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-white text-sm">{action.title}</h4>
                        <p className="text-xs text-amber-400 font-bold">{action.potentialEarnings}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{action.description}</p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Stream-to-Earn Achievements */}
          {achievements.length > 0 && (
            <motion.div
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-700/50 shadow-lg"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.8 }}
            >
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Award className="w-5 h-5 text-amber-400" />
                {t('wallet.earningAchievements')}
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {(achievements || []).filter(achievement => achievement && achievement.id && achievement.icon).map((achievement, idx) => {
                  if (!achievement || !achievement.icon) return null;
                  const AchievementIcon = achievement.icon;
                  return (
                    <motion.div
                      key={achievement.id || idx}
                      className={`bg-gray-700/30 rounded-lg p-4 border ${
                        achievement.completed ? 'border-amber-400/50' : 'border-gray-600/50'
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.9 + idx * 0.1 }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${
                          achievement.completed ? 'bg-amber-500/20' : 'bg-gray-600/50'
                        }`}>
                          <AchievementIcon className={`w-5 h-5 ${
                            achievement.completed ? 'text-amber-400' : 'text-gray-400'
                          }`} />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold text-white text-sm">{achievement.title || 'Unknown'}</h4>
                          <p className="text-xs text-gray-400">{achievement.description || ''}</p>
                        </div>
                        {achievement.completed && (
                          <CheckCircle className="w-5 h-5 text-amber-400" />
                        )}
                      </div>
                      {!achievement.completed && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>{t('wallet.progress')}</span>
                            <span>{achievement.progress}/{achievement.target}</span>
                          </div>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <motion.div
                              className="h-2 rounded-full bg-amber-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">{t('wallet.reward')}</span>
                        <span className="text-sm font-bold text-amber-400">{achievement.reward} $DYO</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Token Utility Education */}
          <motion.div
            className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-400/30 rounded-xl p-4 md:p-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 1.0 }}
          >
            <div className="flex items-start gap-4 mb-4">
              <Info className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
              <div className="flex-1">
                <h3 className="text-lg font-bold text-white mb-2">{t('wallet.whatYouCanDoWithDyo')}</h3>
                <p className="text-sm text-gray-300 mb-4">
                  {t('wallet.dyoTokensUnlockFeatures')}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {tokenUtilities.map((utility, idx) => {
                const UtilityIcon = utility.icon;
                return (
                  <motion.button
                    key={utility.title}
                    onClick={() => navigate(utility.link)}
                    className="bg-gray-800/50 rounded-lg p-4 border border-gray-700/50 hover:border-amber-400/50 transition-all text-left"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 1.1 + idx * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <div className="flex items-center gap-3 mb-2">
                      <div className="p-2 rounded-lg" style={{ backgroundColor: `${utility.color}20` }}>
                        <UtilityIcon className="w-5 h-5" style={{ color: utility.color }} />
                      </div>
                      <ExternalLink className="w-4 h-4 text-gray-400 ml-auto" />
                    </div>
                    <h4 className="font-semibold text-white text-sm mb-1">{utility.title}</h4>
                    <p className="text-xs text-gray-400">{utility.description}</p>
                  </motion.button>
                );
              })}
            </div>
          </motion.div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Wallet Balance - Takes 1 column */}
            <motion.div
              className="lg:col-span-1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.2 }}
            >
              <WalletBalance walletAddress={walletAddress || ''} balance={balance} showAvailable={true} />
            </motion.div>

            {/* Filters - Takes 2 columns */}
            <motion.div
              className="lg:col-span-2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.3 }}
            >
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 md:p-6 border border-gray-700/50 shadow-lg">
                <h3 className="text-lg font-semibold text-white mb-4">{t('wallet.transactionFilters')}</h3>
                <FilterPanel
                  selectedFilters={filters}
                  onFilterSelect={(newFilters: FilterOption) => {
                    setFilters(newFilters);
                  }}
                  options={{
                    type: ['all', 'transfer', 'stake', 'reward'],
                    dateRange: ['all', 'today', 'week', 'month'],
                    amount: ['all', 'high', 'low'],
                  }}
                />
              </div>
            </motion.div>
          </div>

          {/* NFT Gallery and Transaction History */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.4 }}
            >
              <NFTGallery
                nfts={nfts}
                onTransfer={(nft: NFT) => {
                  setSelectedNFT(nft);
                  setIsTransferModalOpen(true);
                }}
              />
            </motion.div>
            
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 1.5 }}
            >
              <TransactionHistory transactions={filteredTransactions} filters={filters} />
            </motion.div>
          </div>

          {/* NFT Transfer Modal */}
          <NFTTransferModal
            isOpen={isTransferModalOpen}
            nft={selectedNFT}
            onClose={() => {
              setIsTransferModalOpen(false);
              setSelectedNFT(null);
            }}
            onTransfer={handleNFTTransfer}
          />
        </>
      )}
    </div>
  );
}
