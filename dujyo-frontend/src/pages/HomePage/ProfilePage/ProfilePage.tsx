import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Music, Video, Gamepad, 
  TrendingUp, User, Wallet, BarChart3, 
  Trophy, ArrowUpRight, Coins, Lock, Award, Clock, Zap, RefreshCw, Copy, Check
} from 'lucide-react';
import { ContentSection } from '../../../components/ContentSection';
import { WalletDashboard } from '../../../components/wallet/WalletDashboard';
import ArtistDashboard from '../../../components/artist/ArtistDashboard';
import { useBlockchain } from '../../../contexts/BlockchainContext';
import { useAuth } from '../../../auth/AuthContext';
import { useLanguage } from '../../../contexts/LanguageContext';
import { getApiBaseUrl } from '../../../utils/apiConfig';
import Logo from '../../../components/common/Logo';

interface ContentItems {
  [key: string]: string[];
}

// ✅ NATIVE BLOCKCHAIN INTERFACES
interface NativeTokenBalance {
  dyo: number;
  dys: number;
  staked: number;
  total: number;
}

interface NativeStakingInfo {
  totalStaked: number;
  availableRewards: number;
  currentApy: number;
  lockPeriod: number;
  nextRewardDate: Date;
  activePositions: StakingPosition[];
}

interface StakingPosition {
  id: string;
  amount: number;
  startTime: number;
  endTime: number;
  rewards: number;
  isActive: boolean;
  lockPeriod: number;
}

interface StakingHistory {
  id: string;
  type: 'stake' | 'unstake' | 'claim';
  amount: number;
  timestamp: number;
  txHash: string;
  status: 'success' | 'pending' | 'failed';
}

// Component to display wallet address with copy functionality
const WalletAddressDisplay: React.FC<{ walletAddress: string }> = ({ walletAddress }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  if (!walletAddress || walletAddress === 'Not connected') {
    return (
      <div className="bg-gray-700/50 rounded-lg p-4 text-gray-400">
        {t('profile.walletNotConnected')}
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-lg p-4 border border-amber-500/30">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <p className="text-xs text-gray-400 mb-1">{t('profile.fullWalletAddress')}</p>
          <p className="text-amber-400 font-mono text-sm break-all">{walletAddress}</p>
        </div>
        <motion.button
          onClick={handleCopy}
          className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 rounded-lg border border-amber-500/50 transition-colors"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {copied ? (
            <>
              <Check size={16} className="text-green-400" />
              <span className="text-green-400 text-sm">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={16} className="text-amber-400" />
              <span className="text-amber-400 text-sm">Copy</span>
            </>
          )}
        </motion.button>
      </div>
    </div>
  );
};

const ProfilePage: React.FC = () => {
  const { account, isAuthenticated, balancesPallet } = useBlockchain();
  const { user, getUserRole, hasRole } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'staking' | 'achievements' | 'artist-dashboard'>(
    hasRole('artist') ? 'artist-dashboard' : 'overview'
  );
  const navigate = useNavigate();
  // ✅ NATIVE BLOCKCHAIN STATES
  const [nativeBalance, setNativeBalance] = useState<NativeTokenBalance>({
    dyo: 0,
    dys: 0,
    staked: 0,
    total: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  
  // ✅ NATIVE STAKING STATES
  const [stakingAmount, setStakingAmount] = useState('');
  const [stakingPeriod, setStakingPeriod] = useState(30);
  const [isStaking, setIsStaking] = useState(false);
  const [stakingMessage, setStakingMessage] = useState('');
  const [nativeStakingInfo, setNativeStakingInfo] = useState<NativeStakingInfo>({
    totalStaked: 0,
    availableRewards: 0,
    currentApy: 12.5,
    lockPeriod: 30,
    nextRewardDate: new Date(),
    activePositions: []
  });
  
  // ✅ UNSTAKE & CLAIM STATES
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [stakingHistory, setStakingHistory] = useState<StakingHistory[]>([]);
  const [selectedPosition, setSelectedPosition] = useState<string>('');

  const profilePageItems: ContentItems = {
    "Your Library": [
      "Cyberpunk Symphony", "Neon Dreams", "Digital Revolution", 
      "Blockchain Beats", "Crypto Anthems", "DeFi Dance",
      "NFT Collection", "Web3 Vibes", "Metaverse Music"
    ],
    "Liked Content": [
      "Electric Vibes", "Future Bass", "Synthwave Classics",
      "AI Generated Music", "Quantum Sounds", "Digital Dreams",
      "Crypto Rock", "Blockchain Blues", "DeFi Jazz"
    ],
    "Recommendations": [
      "AI Generated Music", "Blockchain Beats", "Crypto Anthems",
      "Trending Now", "New Releases", "Popular This Week",
      "Similar Artists", "Genre Mix", "Discover Weekly"
    ],
    "Recently Played": [
      "DUJYO Theme", "Trading Music", "DeFi Dance",
      "Gaming Soundtrack", "Marketplace Mix", "DEX Vibes",
      "Profile Playlist", "Favorites", "Last Session"
    ]
  };

  // ✅ CARGAR BALANCES NATIVOS DE NUESTRA BLOCKCHAIN
  const loadNativeBalances = async () => {
    // ✅ OBTENER ADDRESS DE MÚLTIPLES FUENTES
    let walletAddress = account;
    
    // Si no hay account del contexto, intentar obtenerlo de localStorage
    if (!walletAddress) {
      const walletAccount = localStorage.getItem('dujyo_wallet_account');
      const xwaveWallet = localStorage.getItem('xwave_wallet');
      const dujyoWallet = localStorage.getItem('dujyo_wallet');
      
      if (walletAccount) {
        walletAddress = walletAccount;
      } else if (xwaveWallet) {
        try {
          walletAddress = JSON.parse(xwaveWallet).address;
        } catch (e) {
          console.warn('Error parsing xwave_wallet:', e);
        }
      } else if (dujyoWallet) {
        try {
          walletAddress = JSON.parse(dujyoWallet).address;
        } catch (e) {
          console.warn('Error parsing dujyo_wallet:', e);
        }
      } else if (user?.uid) {
        walletAddress = user.uid;
      }
    }
    
    // ✅ SOLO USAR ADDRESS DE NUESTRA BLOCKCHAIN NATIVA
    if (!walletAddress) {
      console.warn('❌ [NATIVE] No native blockchain address available');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('🔍 [NATIVE] Loading native balances for address:', walletAddress);
      
      const token = localStorage.getItem('jwt_token');
      
      // ✅ USAR BALANCE-DETAIL DE NUESTRA BLOCKCHAIN NATIVA
      const apiBaseUrl = getApiBaseUrl();
      const balanceResponse = await fetch(`${apiBaseUrl}/balance-detail/${walletAddress}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (balanceResponse.ok) {
        const balanceData = await balanceResponse.json();
        
        // ✅ BALANCES NATIVOS SEPARADOS
        const nativeBal: NativeTokenBalance = {
          dyo: balanceData.available_dyo || 0,
          dys: balanceData.dys || 0,
          staked: balanceData.staked || 0,
          total: balanceData.total || 0
        };
        
        setNativeBalance(nativeBal);
        
        console.log('✅ [NATIVE] Native balances loaded:', nativeBal);
      } else {
        throw new Error(`Native balance fetch failed: ${balanceResponse.status}`);
      }
      
      // ✅ CARGAR INFORMACIÓN DE STAKING NATIVO
      await loadNativeStakingInfo();
      
    } catch (error) {
      console.error('❌ Error loading native balances:', error);
      // Fallback a 0 en caso de error
      setNativeBalance({ dyo: 0, dys: 0, staked: 0, total: 0 });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadNativeBalances();
    
    // ✅ ACTUALIZAR BALANCES NATIVOS CADA 15 SEGUNDOS
    const interval = setInterval(() => {
      loadNativeBalances();
    }, 15000);
    
    return () => clearInterval(interval);
  }, [account, user?.uid]); // ✅ DEPENDER DE ACCOUNT Y USER.UID

  // ✅ CARGAR INFORMACIÓN DE STAKING NATIVO
  const loadNativeStakingInfo = async () => {
    if (!account) return;
    
    try {
      const token = localStorage.getItem('jwt_token');
      
      // ✅ OBTENER POSICIONES DE STAKING ACTIVAS
      const apiBaseUrl = getApiBaseUrl();
      const stakingResponse = await fetch(`${apiBaseUrl}/staking/positions/${account}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });
      
      if (stakingResponse.ok) {
        const stakingData = await stakingResponse.json();
        
        setNativeStakingInfo(prev => ({
          ...prev,
          totalStaked: stakingData.totalStaked || 0,
          availableRewards: stakingData.availableRewards || 0,
          activePositions: stakingData.positions || []
        }));
        
        console.log('✅ [NATIVE] Staking info loaded:', stakingData);
      }
    } catch (error) {
      console.error('❌ Error loading native staking info:', error);
    }
  };
  
  // ✅ STAKE NATIVO CON TOKENS DYO
  const handleNativeStake = async () => {
    if (!account) {
      setStakingMessage(t('profile.pleaseConnectWallet'));
      return;
    }
    
    if (!stakingAmount || parseFloat(stakingAmount) <= 0) {
      setStakingMessage(t('profile.pleaseEnterValidAmount'));
      return;
    }
    
    const amount = parseFloat(stakingAmount);
    
    // ✅ VALIDAR BALANCE NATIVO DE DYO
    if (amount > nativeBalance.dyo) {
      setStakingMessage(t('profile.insufficientBalance', { amount: nativeBalance.dyo.toFixed(2) }).replace('{{amount}}', nativeBalance.dyo.toFixed(2)));
      return;
    }
    
    setIsStaking(true);
    setStakingMessage('');
    
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('🔍 [NATIVE] Staking DYO with native address:', account);
      
      // ✅ USAR ENDPOINT DE STAKING NATIVO
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/stake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          account: account, // ✅ SOLO ADDRESS NATIVO
          amount: amount
        })
      });
      
      if (!response.ok) {
        throw new Error('Native staking failed');
      }
      
      const result = await response.json();
      setStakingMessage(t('profile.successfullyStaked', { amount: amount.toString() }).replace('{{amount}}', amount.toString()));
      setStakingAmount('');
      
      // ✅ ACTUALIZAR BALANCES NATIVOS DESPUÉS DE STAKE
      await loadNativeBalances();
      await loadNativeStakingInfo();
      
    } catch (error) {
      setStakingMessage(t('profile.errorPrefix') + ': ' + (error instanceof Error ? error.message : t('profile.unknownError')));
    } finally {
      setIsStaking(false);
    }
  };
  
  // ✅ UNSTAKE NATIVO CON PERIODOS DE LOCK
  const handleNativeUnstake = async () => {
    if (!account) {
      setStakingMessage(t('profile.pleaseConnectWallet'));
      return;
    }
    
    if (!selectedPosition) {
      setStakingMessage(t('profile.pleaseSelectPosition'));
      return;
    }
    
    setIsUnstaking(true);
    setStakingMessage('');
    
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('🔍 [NATIVE] Unstaking position:', selectedPosition);
      
      // ✅ USAR ENDPOINT DE UNSTAKE NATIVO
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/unstake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          account: account, // ✅ SOLO ADDRESS NATIVO
          position_id: selectedPosition
        })
      });
      
      if (!response.ok) {
        throw new Error('Native unstaking failed');
      }
      
      const result = await response.json();
      setStakingMessage(`Successfully unstaked position! Received ${result.amount} DYO + ${result.rewards} rewards`);
      setSelectedPosition('');
      
      // ✅ ACTUALIZAR BALANCES NATIVOS DESPUÉS DE UNSTAKE
      await loadNativeBalances();
      await loadNativeStakingInfo();
      
    } catch (error) {
      setStakingMessage(t('profile.errorPrefix') + ': ' + (error instanceof Error ? error.message : t('profile.unknownError')));
    } finally {
      setIsUnstaking(false);
    }
  };
  
  // ✅ CLAIM REWARDS NATIVOS
  const handleClaimRewards = async () => {
    if (!account) {
      setStakingMessage(t('profile.pleaseConnectWallet'));
      return;
    }
    
    if (nativeStakingInfo.availableRewards <= 0) {
      setStakingMessage(t('profile.noRewardsAvailable'));
      return;
    }
    
    setIsClaiming(true);
    setStakingMessage('');
    
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      console.log('🔍 [NATIVE] Claiming rewards for:', account);
      
      // ✅ USAR ENDPOINT DE CLAIM REWARDS NATIVO
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/staking/claim-rewards`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          account: account // ✅ SOLO ADDRESS NATIVO
        })
      });
      
      if (!response.ok) {
        throw new Error('Native claim rewards failed');
      }
      
      const result = await response.json();
      setStakingMessage(t('profile.successfullyClaimed', { amount: result.amount.toString() }).replace('{{amount}}', result.amount.toString()));
      
      // ✅ ACTUALIZAR BALANCES NATIVOS DESPUÉS DE CLAIM
      await loadNativeBalances();
      await loadNativeStakingInfo();
      
    } catch (error) {
      setStakingMessage(t('profile.errorPrefix') + ': ' + (error instanceof Error ? error.message : t('profile.unknownError')));
    } finally {
      setIsClaiming(false);
    }
  };

  const handleContentClick = (_trackTitle: string) => {
    // Handle content click
  };

  // ✅ STATS NATIVOS DE NUESTRA BLOCKCHAIN
  const nativeStats = [
    { 
      label: t('profile.dyoBalance'), 
      value: isLoading ? "..." : `${nativeBalance.dyo.toFixed(2)} DYO`, 
      icon: Wallet, 
      color: "#4ECDC4" 
    },
    { 
      label: t('profile.dysBalance'), 
      value: isLoading ? "..." : `${nativeBalance.dys.toFixed(2)} DYS`, 
      icon: Coins, 
      color: "#EA580C" 
    },
    { 
      label: t('profile.staked'), 
      value: isLoading ? "..." : `${nativeBalance.staked.toFixed(2)} DYO`, 
      icon: Lock, 
      color: "#FFD700" 
    },
    { 
      label: t('profile.nativeAddress'), 
      value: account ? `${account.slice(0, 6)}...${account.slice(-4)}` : t('profile.notConnected'), 
      icon: User, 
      color: "#FF6B6B" 
    }
  ];

  const achievements = React.useMemo(() => [
    { title: t('profile.achievementFirstTrade'), description: t('profile.achievementFirstTradeDesc'), icon: TrendingUp, unlocked: true, rarity: "common", progress: 100 },
    { title: t('profile.achievementMusicLover'), description: t('profile.achievementMusicLoverDesc'), icon: Music, unlocked: true, rarity: "rare", progress: 100 },
    { title: t('profile.achievementGamingMaster'), description: t('profile.achievementGamingMasterDesc'), icon: Gamepad, unlocked: false, rarity: "epic", progress: 65 },
    { title: t('profile.achievementContentCreator'), description: t('profile.achievementContentCreatorDesc'), icon: Video, unlocked: false, rarity: "legendary", progress: 30 },
    { title: t('profile.achievementStakingPro'), description: t('profile.achievementStakingProDesc'), icon: Lock, unlocked: false, rarity: "rare", progress: 45 },
    { title: t('profile.achievementEarlyAdopter'), description: t('profile.achievementEarlyAdopterDesc'), icon: Zap, unlocked: true, rarity: "legendary", progress: 100 },
    { title: t('profile.achievementValidator'), description: t('profile.achievementValidatorDesc'), icon: Award, unlocked: false, rarity: "epic", progress: 0 },
    { title: t('profile.achievementTopListener'), description: t('profile.achievementTopListenerDesc'), icon: Trophy, unlocked: false, rarity: "rare", progress: 78 }
  ], [t]);

  return (
    <div className="min-h-screen text-white" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Hero Section */}
      <motion.div
        className="relative overflow-hidden"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
      >
        {/* Animated Background */}
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10" />
          <motion.div
            className="absolute inset-0"
            animate={{
              background: [
                'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 80% 50%, rgba(0, 245, 255, 0.1) 0%, transparent 50%)',
                'radial-gradient(circle at 20% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)'
              ]
            }}
            transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          />
        </div>

        {/* Hero Content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            {/* Logo Integration */}
            <motion.div
              className="mb-6 flex justify-center"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
            >
              <Logo size="lg" showText={false} variant="icon" />
            </motion.div>

            <motion.div
              className="w-32 h-32 mx-auto mb-6 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <User size={64} className="text-white" />
            </motion.div>

            <motion.h1
              className="text-4xl md:text-6xl font-bold mb-4"
              initial={{ opacity: 0, y: -50 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
            >
              <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-orange-400 bg-clip-text text-transparent">
                {account ? `${account.slice(0, 6)}...${account.slice(-4)}` : t('profile.userProfile')}
              </span>
            </motion.h1>

            <motion.p
              className="text-xl text-gray-300 max-w-2xl mx-auto mb-8"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
            >
              {user?.displayName || 'DUJYO User'} • {getUserRole().toUpperCase()} • {t('profile.blockchainEnthusiast')}
            </motion.p>
            
            {/* Role Badge */}
            <motion.div
              className="flex justify-center mb-8"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
            >
              <div className={`px-4 py-2 rounded-full text-sm font-semibold ${
                hasRole('admin') ? 'bg-red-500/20 text-red-400 border border-red-500/50' :
                hasRole('artist') ? 'bg-pink-500/20 text-orange-400 border border-pink-500/50' :
                hasRole('validator') ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' :
                'bg-green-500/20 text-green-400 border border-green-500/50'
              }`}>
                {getUserRole().toUpperCase()}
              </div>
            </motion.div>

            {/* Become Artist Button for Listeners */}
            {!hasRole('artist') && !hasRole('validator') && (
              <motion.div
                className="flex justify-center mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 1.0 }}
              >
                <button
                  onClick={() => navigate('/become-artist')}
                  className="bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-semibold py-3 px-8 rounded-lg transition-all duration-300 flex items-center gap-2 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Music size={20} />
                  {t('profile.becomeArtist')}
                  <ArrowUpRight size={20} />
                </button>
              </motion.div>
            )}

            {/* XP Bar */}
          </div>
        </div>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex justify-center space-x-2 py-4">
            {[
              ...(hasRole('artist') ? [] : [{ id: 'overview', label: t('profile.overview'), icon: BarChart3, color: '#8B5CF6' }]),
              { id: 'wallet', label: t('profile.wallet'), icon: Wallet, color: '#00F5FF' },
              { id: 'staking', label: t('profile.staking'), icon: Coins, color: '#F59E0B' },
              { id: 'achievements', label: t('profile.achievements'), icon: Trophy, color: '#EA580C' },
              ...(hasRole('artist') ? [{ id: 'artist-dashboard', label: t('profile.artistDashboard'), icon: Music, color: '#FF6B6B' }] : [])
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;

              return (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`relative flex items-center gap-2 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 ${
                    isActive
                      ? 'text-white'
                      : 'text-gray-400 hover:text-gray-300'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {isActive && (
                    <motion.div
                      className="absolute inset-0 rounded-xl"
                      style={{
                        background: `linear-gradient(135deg, ${tab.color}20, transparent)`,
                        border: `2px solid ${tab.color}`,
                        boxShadow: `0 0 20px ${tab.color}50`
                      }}
                      layoutId="activeTab"
                      transition={{ duration: 0.3 }}
                    />
                  )}
                  <Icon size={20} style={{ color: isActive ? tab.color : undefined }} />
                  <span className="relative z-10">{tab.label}</span>
                </motion.button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          transition={{ duration: 0.3 }}
        >
          {activeTab === 'overview' && (
            <div className="space-y-8">
              {/* ✅ Stats Grid Nativo - Mejorado con animaciones y efectos visuales */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {nativeStats.map((stat, index) => {
                  const Icon = stat.icon;
                  return (
                    <motion.div
                      key={stat.label}
                      className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-xl relative overflow-hidden group"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                    >
                      {/* Glow effect on hover */}
                      <motion.div
                        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                        style={{
                          background: `radial-gradient(circle at center, ${stat.color}20, transparent)`,
                          filter: 'blur(20px)'
                        }}
                      />
                      
                      <div className="relative z-10">
                        <div className="flex items-center justify-between mb-4">
                          <motion.div 
                            className="p-3 rounded-lg"
                            style={{ backgroundColor: `${stat.color}20` }}
                            whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                            transition={{ duration: 0.5 }}
                          >
                            <Icon size={28} style={{ color: stat.color }} />
                          </motion.div>
                          <motion.div
                            whileHover={{ scale: 1.2, rotate: 45 }}
                            transition={{ type: "spring", stiffness: 300 }}
                          >
                            <ArrowUpRight size={18} className="text-gray-400 group-hover:text-amber-400 transition-colors" />
                          </motion.div>
                        </div>
                        <motion.p 
                          className="text-3xl font-bold text-white mb-1"
                          initial={{ scale: 0.8 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: index * 0.1 + 0.2, type: "spring" }}
                        >
                          {stat.value}
                        </motion.p>
                        <p className="text-gray-400 text-sm font-medium">{stat.label}</p>
                        
                        {/* Progress indicator for dynamic stats */}
                        {stat.label.includes("Balance") && (
                          <motion.div 
                            className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden"
                            initial={{ width: 0 }}
                            animate={{ width: "100%" }}
                            transition={{ delay: index * 0.1 + 0.3, duration: 0.5 }}
                          >
                            <motion.div
                              className="h-full rounded-full"
                              style={{ 
                                background: `linear-gradient(90deg, ${stat.color}, ${stat.color}80)`,
                                width: "100%"
                              }}
                              initial={{ x: "-100%" }}
                              animate={{ x: 0 }}
                              transition={{ delay: index * 0.1 + 0.4, duration: 0.6, ease: "easeOut" }}
                            />
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Wallet Dashboard */}
              <motion.div
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                  <Wallet size={24} className="text-amber-400" />
                  {t('profile.walletDashboard')}
                </h3>
                <WalletDashboard />
              </motion.div>

              {/* Content Sections */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {Object.keys(profilePageItems).map((title, index) => (
                  <motion.div
                    key={title}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.6 + index * 0.1 }}
                  >
                    <ContentSection
                      title={title}
                      items={profilePageItems[title]}
                      onItemClick={handleContentClick}
                    />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'wallet' && (
            <div className="space-y-8">
              {/* Wallet Address Card - Mostrar wallet completa */}
              <motion.div
                className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-6 border border-amber-500/30 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                  <Wallet size={24} className="text-amber-400" />
                  {t('profile.yourWalletAddress')}
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  {t('profile.walletAddressDesc')}
                </p>
                <WalletAddressDisplay walletAddress={user?.uid || account || 'Not connected'} />
              </motion.div>

              <motion.div
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h3 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                  <Wallet size={32} className="text-amber-400" />
                  {t('profile.walletManagement')}
                </h3>
                <WalletDashboard />
              </motion.div>
            </div>
          )}

          {activeTab === 'staking' && (
            <div className="space-y-8">
              {/* ✅ Native Blockchain Status */}
              <motion.div
                className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-6 border border-green-500/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Zap className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">Native Blockchain Connected</h3>
                      <p className="text-green-400 text-sm">DUJYO Native Network • Real-time sync active</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 text-sm font-medium">{t('profile.live')}</span>
                  </div>
                </div>
              </motion.div>

              {/* Staking Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <motion.div
                  className="bg-gradient-to-br from-yellow-500/20 to-orange-500/20 backdrop-blur-sm rounded-xl p-6 border border-yellow-500/30"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-yellow-500/20 rounded-lg">
                      <Coins className="w-6 h-6 text-yellow-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{t('profile.totalStaked')}</h3>
                      <p className="text-2xl font-bold text-yellow-400">{nativeStakingInfo.totalStaked.toFixed(2)} DYO</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 backdrop-blur-sm rounded-xl p-6 border border-green-500/30"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.2 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-green-500/20 rounded-lg">
                      <Award className="w-6 h-6 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{t('profile.availableRewards')}</h3>
                      <p className="text-2xl font-bold text-green-400">{nativeStakingInfo.availableRewards.toFixed(2)} DYO</p>
                    </div>
                  </div>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-br from-orange-500/20 to-amber-500/20 backdrop-blur-sm rounded-xl p-6 border border-orange-500/30"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <TrendingUp className="w-6 h-6 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-lg font-semibold text-white">{t('profile.nativeApy')}</h3>
                      <p className="text-2xl font-bold text-blue-400">{nativeStakingInfo.currentApy}%</p>
                    </div>
                  </div>
                </motion.div>
              </div>

              {/* Staking Form */}
              <motion.div
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-3">
                  <Lock className="w-6 h-6 text-yellow-400" />
                  {t('profile.stakeDyoTokens')}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('profile.amountToStake')}
                    </label>
                    <input
                      type="number"
                      value={stakingAmount}
                      onChange={(e) => setStakingAmount(e.target.value)}
                      placeholder="Enter amount"
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      {t('profile.available')}: {nativeBalance.dyo.toFixed(2)} DYO
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      {t('profile.stakingPeriod')}
                    </label>
                    <select
                      value={stakingPeriod}
                      onChange={(e) => setStakingPeriod(Number(e.target.value))}
                      className="w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-yellow-500/50 focus:border-transparent"
                    >
                      <option value={7}>7 days (8% APY)</option>
                      <option value={30}>30 days (12% APY)</option>
                      <option value={90}>90 days (18% APY)</option>
                      <option value={365}>365 days (25% APY)</option>
                    </select>
                  </div>
                </div>

                {stakingMessage && (
                  <div className={`mt-4 p-4 rounded-lg ${
                    stakingMessage.includes('Successfully') 
                      ? 'bg-green-500/20 border border-green-500/30 text-green-400'
                      : 'bg-red-500/20 border border-red-500/30 text-red-400'
                  }`}>
                    {stakingMessage}
                  </div>
                )}

                <div className="mt-6 space-y-4">
                  {/* ✅ STAKE BUTTON */}
                  <button
                    onClick={handleNativeStake}
                    disabled={isStaking || !stakingAmount || !account}
                    className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                  >
                    {isStaking ? (
                      <>
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        {t('profile.staking')}
                      </>
                    ) : (
                      <>
                        <Lock className="w-5 h-5" />
                        {t('profile.stakeDyo')}
                      </>
                    )}
                  </button>
                  
                  {/* ✅ UNSTAKE SECTION */}
                  {nativeStakingInfo.activePositions.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-lg font-semibold text-white">{t('profile.activePositions')}</h4>
                      {nativeStakingInfo.activePositions.map((position) => (
                        <div key={position.id} className="bg-gray-700/30 rounded-lg p-4">
                          <div className="flex justify-between items-center mb-2">
                            <span className="text-white font-medium">{(position.amount || 0).toFixed(2)} DYO</span>
                            <span className="text-gray-400 text-sm">{t('profile.lock')}: {position.lockPeriod || 0} days</span>
                          </div>
                          <div className="flex justify-between items-center mb-3">
                            <span className="text-green-400 text-sm">{t('profile.rewards')}: {(position.rewards || 0).toFixed(2)} DYO</span>
                            <span className="text-gray-400 text-sm">
                              {t('profile.ends')}: {new Date((position.endTime || 0) * 1000).toLocaleDateString()}
                            </span>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedPosition(position.id);
                              handleNativeUnstake();
                            }}
                            disabled={isUnstaking || new Date().getTime() < position.endTime * 1000}
                            className="w-full bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                          >
                            {isUnstaking ? (
                              <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                                {t('profile.unstaking')}
                              </>
                            ) : (
                              <>
                                <Zap className="w-4 h-4" />
                                {new Date().getTime() < position.endTime * 1000 ? t('profile.locked') : t('profile.unstake')}
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {/* ✅ CLAIM REWARDS BUTTON */}
                  {nativeStakingInfo.availableRewards > 0 && (
                    <button
                      onClick={handleClaimRewards}
                      disabled={isClaiming || !account}
                      className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300 flex items-center justify-center gap-2"
                    >
                      {isClaiming ? (
                        <>
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          {t('profile.claiming')}
                        </>
                      ) : (
                        <>
                          <Award className="w-5 h-5" />
                          {t('profile.claimRewards')} {nativeStakingInfo.availableRewards.toFixed(2)} {t('profile.dyoRewards')}
                        </>
                      )}
                    </button>
                  )}
                </div>
              </motion.div>

              {/* ✅ Staking History Section */}
              <motion.div
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                    <Clock className="w-6 h-6 text-blue-400" />
                    {t('profile.stakingHistory')}
                  </h2>
                  <button
                    onClick={loadNativeBalances}
                    className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors"
                  >
                    <RefreshCw size={16} />
                    {t('profile.refresh')}
                  </button>
                </div>

                {stakingHistory.length > 0 ? (
                  <div className="space-y-4">
                    {stakingHistory.map((tx) => (
                      <motion.div
                        key={tx.id}
                        className="bg-gray-700/30 rounded-lg p-4 border border-gray-600/30"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${
                              tx.type === 'stake' ? 'bg-yellow-500/20' :
                              tx.type === 'unstake' ? 'bg-red-500/20' :
                              'bg-green-500/20'
                            }`}>
                              {tx.type === 'stake' ? <Lock size={16} className="text-yellow-400" /> :
                               tx.type === 'unstake' ? <Zap size={16} className="text-red-400" /> :
                               <Award size={16} className="text-green-400" />}
                            </div>
                            <div>
                              <p className="text-white font-medium capitalize">{tx.type}</p>
                              <p className="text-gray-400 text-sm">
                                {new Date(tx.timestamp * 1000).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-semibold">{tx.amount.toFixed(2)} DYO</p>
                            <p className={`text-xs ${
                              tx.status === 'success' ? 'text-green-400' :
                              tx.status === 'pending' ? 'text-yellow-400' :
                              'text-red-400'
                            }`}>
                              {tx.status.toUpperCase()}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500 font-mono">
                          TX: {tx.txHash}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400 text-lg">{t('profile.noStakingHistory')}</p>
                    <p className="text-gray-500 text-sm">{t('profile.stakingHistoryDesc')}</p>
                  </div>
                )}
              </motion.div>
            </div>
          )}

          {activeTab === 'achievements' && (
            <div className="space-y-8">
              <motion.div
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-3xl font-bold text-white flex items-center gap-2">
                    <motion.div
                      animate={{ rotate: [0, 10, -10, 0] }}
                      transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
                    >
                      <Trophy size={32} className="text-yellow-400" />
                    </motion.div>
                    {t('profile.achievements')}
                  </h3>
                  <div className="text-sm text-gray-400">
                    {achievements.filter(a => a.unlocked).length} / {achievements.length} {t('profile.unlocked')}
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {achievements.map((achievement, index) => {
                    const Icon = achievement.icon;
                    const rarityColors = {
                      common: { bg: 'from-gray-500/20 to-gray-600/20', border: 'border-gray-500/50', icon: 'text-gray-400', glow: 'gray-400' },
                      rare: { bg: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/50', icon: 'text-blue-400', glow: 'blue-400' },
                      epic: { bg: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/50', icon: 'text-purple-400', glow: 'purple-400' },
                      legendary: { bg: 'from-amber-500/20 to-orange-500/20', border: 'border-amber-500/50', icon: 'text-amber-400', glow: 'amber-400' }
                    };
                    const colors = rarityColors[achievement.rarity as keyof typeof rarityColors] || rarityColors.common;
                    
                    return (
                      <motion.div
                        key={achievement.title}
                        className={`relative p-6 rounded-xl border-2 transition-all duration-300 overflow-hidden group ${
                          achievement.unlocked 
                            ? `bg-gradient-to-br ${colors.bg} ${colors.border} shadow-lg` 
                            : 'bg-gray-800/30 border-gray-600/30 opacity-60'
                        }`}
                        initial={{ opacity: 0, scale: 0.8, rotateY: -90 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                        whileHover={{ scale: 1.05, y: -5 }}
                      >
                        {/* Animated glow for unlocked achievements */}
                        {achievement.unlocked && (
                          <motion.div
                            className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                            style={{
                              background: `radial-gradient(circle at center, ${colors.glow}20, transparent)`,
                              filter: 'blur(30px)'
                            }}
                            animate={{
                              opacity: [0, 0.3, 0],
                            }}
                            transition={{ duration: 2, repeat: Infinity }}
                          />
                        )}
                        
                        {/* Rarity badge */}
                        <div className={`absolute top-2 right-2 px-2 py-1 rounded-full text-xs font-bold ${
                          achievement.unlocked 
                            ? `bg-${colors.glow}/20 text-${colors.glow} border border-${colors.glow}/50`
                            : 'bg-gray-700/50 text-gray-500'
                        }`}>
                          {achievement.rarity.toUpperCase()}
                        </div>
                        
                        <div className="relative z-10">
                          <div className="flex items-start gap-4 mb-4">
                            <motion.div 
                              className={`p-4 rounded-xl ${
                                achievement.unlocked ? `bg-${colors.glow}/20` : 'bg-gray-600/20'
                              }`}
                              whileHover={{ rotate: [0, -15, 15, -15, 0], scale: 1.1 }}
                              transition={{ duration: 0.5 }}
                            >
                              <Icon size={32} className={achievement.unlocked ? colors.icon : 'text-gray-500'} />
                            </motion.div>
                            <div className="flex-1">
                              <h4 className={`font-bold text-lg mb-1 ${achievement.unlocked ? 'text-white' : 'text-gray-500'}`}>
                                {achievement.title}
                              </h4>
                              <p className={`text-sm ${achievement.unlocked ? 'text-gray-300' : 'text-gray-600'}`}>
                                {achievement.description}
                              </p>
                            </div>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs text-gray-400">{t('profile.progress')}</span>
                              <span className={`text-xs font-bold ${achievement.unlocked ? colors.icon : 'text-gray-500'}`}>
                                {achievement.progress}%
                              </span>
                            </div>
                            <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                className={`h-full rounded-full ${
                                  achievement.unlocked 
                                    ? `bg-gradient-to-r from-${colors.glow} to-${colors.glow}/60`
                                    : 'bg-gray-600'
                                }`}
                                initial={{ width: 0 }}
                                animate={{ width: `${achievement.progress}%` }}
                                transition={{ delay: index * 0.1 + 0.3, duration: 0.8, ease: "easeOut" }}
                              />
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}

          {activeTab === 'artist-dashboard' && hasRole('artist') && (
            <div className="space-y-8">
              <motion.div
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 shadow-lg"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h3 className="text-3xl font-bold text-white mb-6 flex items-center gap-2">
                  <Music size={32} className="text-orange-400" />
                  {t('profile.artistDashboard')}
                </h3>
                <ArtistDashboard />
              </motion.div>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default ProfilePage;