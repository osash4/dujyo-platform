import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { DEXProvider } from '../contexts/DEXContext';
import DEXDashboard from '../components/DEX/DEXDashboard';
import DEXSwap from '../components/DEX/DEXSwap';
import DEXLiquidity from '../components/DEX/DEXLiquidity';
import SimpleAppLayout from '../components/Layout/SimpleAppLayout';
import { WalletConnector } from '../components/wallet/WalletConnector';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useAuth } from '../auth/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { useLanguage } from '../contexts/LanguageContext';
import { getApiBaseUrl } from '../utils/apiConfig';
import { BarChart3, ArrowLeftRight, Droplets, Zap, Sparkles, TrendingUp, Coins, Music, Video, Gamepad2, Wallet, TrendingDown, ExternalLink, Info, Award, Clock, ArrowRight } from 'lucide-react';
import Logo from '../components/common/Logo';
import '../styles/neon-colors.css';

const DEXPage: React.FC = () => {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'swap' | 'liquidity'>('dashboard');
  const { setPlayerPosition } = usePlayerContext();
  const { user, getUserRole } = useAuth();
  const { account } = useWallet();
  const [isMobile, setIsMobile] = useState(false);
  const [streamingEarnings, setStreamingEarnings] = useState(0);
  const [streamCount, setStreamCount] = useState(0);
  const [earningRate, setEarningRate] = useState(0);
  const [stakingAPY, setStakingAPY] = useState(0);
  const [isLoadingEarnings, setIsLoadingEarnings] = useState(false);
  const [showBridgeModal, setShowBridgeModal] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Set player position to top when component mounts
  useEffect(() => {
    setPlayerPosition('top');
  }, [setPlayerPosition]);

  // Fetch streaming earnings
  useEffect(() => {
    if (account || user?.email) {
      fetchStreamingEarnings();
      fetchStakingAPY();
    }
  }, [account, user]);

  const fetchStreamingEarnings = async () => {
    setIsLoadingEarnings(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const userId = account || user?.email || '';
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
        setStreamingEarnings(data.totalEarnings || data.weeklyEarnings || 0);
        setStreamCount(data.streamCount || 0);
        setEarningRate(data.earningRate || 0.01);
      }
    } catch (error) {
      console.error('Error fetching streaming earnings:', error);
    } finally {
      setIsLoadingEarnings(false);
    }
  };

  const fetchStakingAPY = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/staking/apy`);
      if (response.ok) {
        const data = await response.json();
        setStakingAPY(data.apy || 12.5);
      }
    } catch (error) {
      console.error('Error fetching staking APY:', error);
    }
  };

  const handleStreamToDEXBridge = async () => {
    if (!account) {
      // Prompt to connect wallet
      return;
    }
    setShowBridgeModal(true);
  };

  const tabs = React.useMemo(() => [
    {
      id: 'dashboard',
      label: t('dex.dashboard'),
      icon: BarChart3,
      color: '#00F5FF',
      description: t('dex.analyticsMetrics')
    },
    {
      id: 'swap',
      label: t('dex.swap'),
      icon: ArrowLeftRight,
      color: '#F59E0B',
      description: t('dex.tradeTokens')
    },
    {
      id: 'liquidity',
      label: t('dex.liquidity'),
      icon: Droplets,
      color: '#EA580C',
      description: t('dex.provideLiquidity')
    }
  ], [t]);

  const tokenUtilityActions = React.useMemo(() => [
    {
      id: 'stake',
      title: t('dex.stakeEarn'),
      description: t('dex.earnApy', { apy: stakingAPY }),
      link: '/staking',
      icon: TrendingUp,
      color: '#F59E0B',
      badge: t('dex.highApy')
    },
    {
      id: 'liquidity',
      title: t('dex.provideLiquidity'),
      description: t('dex.earnFeesFromTrading'),
      link: '#liquidity',
      icon: Droplets,
      color: '#FBBF24',
      badge: t('dex.feeEarnings')
    },
    {
      id: 'trade',
      title: t('dex.tradeSwap'),
      description: t('dex.swapDyoForTokens'),
      link: '#swap',
      icon: ArrowLeftRight,
      color: '#EA580C',
      badge: t('dex.activeTrading')
    }
  ], [t, stakingAPY]);

  const recommendedPairs = [
    { from: 'DYO', to: 'DYS', liquidity: 'High', volume: '$1.2M' },
    { from: 'DYO', to: 'ETH', liquidity: 'Medium', volume: '$850K' },
    { from: 'DYO', to: 'USDT', liquidity: 'High', volume: '$2.1M' }
  ];

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  return (
    <DEXProvider>
      <SimpleAppLayout>
        <div className="min-h-screen neon-base" style={{ backgroundColor: 'var(--bg-primary)' }}>

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
              <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-600/10" />
              <motion.div
                className="absolute inset-0"
                animate={{
                  background: [
                    'radial-gradient(circle at 20% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)',
                    'radial-gradient(circle at 80% 50%, rgba(0, 245, 255, 0.08) 0%, transparent 50%)',
                    'radial-gradient(circle at 20% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)'
                  ]
                }}
                transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Hero Content */}
            <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <div className="text-center">
                {/* Epic Logo + Title */}
                <motion.div
                  className="mb-8"
                  initial={{ opacity: 0, scale: 0.5, rotate: -180 }}
                  animate={{ opacity: 1, scale: 1, rotate: 0 }}
                  transition={{ duration: 1.2, type: "spring", stiffness: 100, delay: 0.2 }}
                >
                  {/* Glow Effect Behind Logo - Optimized */}
                  <motion.div
                    className="absolute inset-0 flex justify-center items-center"
                    animate={{
                      scale: [1, 1.2, 1],
                      opacity: [0.3, 0.6, 0.3]
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    style={{ willChange: 'transform, opacity' }}
                  >
                    <div className="w-48 h-48 md:w-96 md:h-96 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 rounded-full blur-3xl" />
                  </motion.div>

                  {/* Floating Particles - Reduced on mobile */}
                  {[...Array(isMobile ? 4 : 8)].map((_, i) => {
                    const particleCount = isMobile ? 4 : 8;
                    const radius = isMobile ? 100 : 180;
                    const radiusMax = isMobile ? 130 : 220;
                    return (
                    <motion.div
                      key={i}
                      className="absolute"
                      initial={{ opacity: 0, scale: 0 }}
                      animate={{
                        opacity: [0, 1, 0],
                        scale: [0, 1, 0],
                        x: [
                            Math.cos((i * Math.PI * 2) / particleCount) * radius,
                            Math.cos((i * Math.PI * 2) / particleCount) * radiusMax,
                            Math.cos((i * Math.PI * 2) / particleCount) * radius
                        ],
                        y: [
                            Math.sin((i * Math.PI * 2) / particleCount) * radius,
                            Math.sin((i * Math.PI * 2) / particleCount) * radiusMax,
                            Math.sin((i * Math.PI * 2) / particleCount) * radius
                        ]
                      }}
                      transition={{
                        duration: 4,
                        repeat: Infinity,
                          delay: i * 0.2,
                          ease: "easeInOut"
                      }}
                        style={{ willChange: 'transform, opacity' }}
                    >
                      <Sparkles 
                          className="w-3 h-3 md:w-5 md:h-5 text-amber-400" 
                        style={{ filter: 'drop-shadow(0 0 8px rgba(245, 158, 11, 0.8))' }}
                      />
                    </motion.div>
                    );
                  })}

                  {/* Main Logo - Responsive */}
                  <motion.div
                    className="relative z-10 mb-4 md:mb-6"
                    whileHover={{ scale: 1.05 }}
                    transition={{ type: "spring", stiffness: 300 }}
                  >
                    <Logo size="2xl" showText={false} variant="icon" className="mb-3 md:mb-6 md:hidden" />
                    <Logo size="3xl" showText={false} variant="icon" className="mb-3 md:mb-6 hidden md:block" />
                    <Logo size="lg" variant="text" className="md:hidden" />
                    <Logo size="2xl" variant="text" className="hidden md:block" />
                  </motion.div>

                  {/* Pulsing Ring - Responsive */}
                  <motion.div
                    className="absolute inset-0 flex justify-center items-center"
                    animate={{
                      scale: [1, 1.3, 1],
                      opacity: [0.5, 0, 0.5]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                    style={{ willChange: 'transform, opacity' }}
                  >
                    <div className="w-64 h-64 md:w-80 md:h-80 border-2 border-amber-400/30 rounded-full" />
                  </motion.div>
                </motion.div>

                {/* Title with Logo Text */}
                <motion.div
                  className="mb-4"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 1, delay: 0.6 }}
                >
                  <Logo size="xl" showText={true} variant="text" className="justify-center mb-2" />
                  <motion.h1
                    className="text-2xl sm:text-3xl md:text-5xl font-bold text-gray-300 mt-2 md:mt-4"
                    animate={{
                      textShadow: [
                        '0 0 20px rgba(0, 245, 255, 0.5)',
                        '0 0 40px rgba(0, 245, 255, 0.8), 0 0 60px rgba(245, 158, 11, 0.6)',
                        '0 0 20px rgba(0, 245, 255, 0.5)'
                      ]
                    }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                  >
                    DEX
                  </motion.h1>
                </motion.div>

                {/* Streaming Earnings Display */}
                {streamingEarnings > 0 && (
                  <motion.div
                    className="max-w-2xl mx-auto mb-6 p-4 md:p-6 bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-xl"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.8 }}
                  >
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <Coins className="w-5 h-5 text-amber-400" />
                      <span className="text-sm font-semibold text-amber-300">{t('dex.earnedFromStreaming')}</span>
                    </div>
                    <div className="flex items-center justify-center gap-6 flex-wrap">
                      <div className="text-center">
                        <p className="text-3xl font-bold text-amber-400">{streamingEarnings.toFixed(2)} $DYO</p>
                        <p className="text-xs text-gray-400 mt-1">{t('dex.totalEarnings')}</p>
                      </div>
                      <div className="h-12 w-px bg-gray-600" />
                      <div className="text-center">
                        <p className="text-xl font-bold text-amber-300">{formatNumber(streamCount)}</p>
                        <p className="text-xs text-gray-400 mt-1">{t('dex.streamsViewsPlays')}</p>
                      </div>
                      <div className="h-12 w-px bg-gray-600" />
                      <div className="text-center">
                        <p className="text-xl font-bold text-amber-300">{earningRate.toFixed(3)} $DYO</p>
                        <p className="text-xs text-gray-400 mt-1">{t('dex.perStream')}</p>
                      </div>
                    </div>
                    <motion.button
                      onClick={handleStreamToDEXBridge}
                      className="mt-4 px-6 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all duration-300 flex items-center gap-2 mx-auto"
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      <ArrowRight className="w-4 h-4" />
                      <span>{t('dex.transferToDex')}</span>
                    </motion.button>
                  </motion.div>
                )}

                {/* Subtitle with Stats */}
                <motion.div
                  className="mb-8"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 1, delay: 0.8 }}
                >
                  <p className="text-base sm:text-lg md:text-xl text-gray-300 mb-4 md:mb-6 max-w-2xl mx-auto px-4">
                    {t('dex.subtitle')}
                  </p>
                  
                  {/* Quick Stats - Responsive */}
                  <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mt-4 md:mt-6 px-4">
                    <motion.div
                      className="flex items-center gap-2 px-4 py-2 card rounded-lg border border-amber-400/20"
                      whileHover={{ scale: 1.05 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.9 }}
                    >
                      <TrendingUp className="w-5 h-5 text-amber-400" />
                      <div className="text-left">
                        <p className="text-xs text-gray-400">{t('dex.volume24h')}</p>
                        <p className="text-sm font-bold text-amber-400">$2.4M</p>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      className="flex items-center gap-2 px-4 py-2 card rounded-lg border border-orange-400/20"
                      whileHover={{ scale: 1.05 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1 }}
                    >
                      <Droplets className="w-5 h-5 text-orange-400" />
                      <div className="text-left">
                        <p className="text-xs text-gray-400">{t('dex.totalLiquidity')}</p>
                        <p className="text-sm font-bold text-orange-400">$18.7M</p>
                      </div>
                    </motion.div>
                    
                    <motion.div
                      className="flex items-center gap-2 px-4 py-2 card rounded-lg border border-cyan-400/20"
                      whileHover={{ scale: 1.05 }}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.1 }}
                    >
                      <Zap className="w-5 h-5 text-cyan-400" />
                      <div className="text-left">
                        <p className="text-xs text-gray-400">{t('dex.activePairs')}</p>
                        <p className="text-sm font-bold text-cyan-400">12</p>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>

                {/* Active Pair Display */}
                <motion.div
                  className="flex items-center justify-center gap-4 mb-8"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                >
                  <div className="flex items-center gap-3 px-6 py-3 rounded-xl bg-gray-800/50 border border-amber-400/30">
                    <div className="w-8 h-8 bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">DY</span>
                    </div>
                                <span className="text-2xl font-bold text-amber-400">DYO</span>
                    <motion.div
                      animate={{ rotate: [0, 180, 360] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <ArrowLeftRight size={24} className="text-gray-400" />
                    </motion.div>
                    <div className="w-8 h-8 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-sm">DY</span>
                    </div>
                                 <span className="text-2xl font-bold text-orange-500">DYS</span>
                  </div>
                </motion.div>

                {/* Connection Status and Wallet */}
                <motion.div
                  className="flex items-center justify-center gap-6 flex-wrap"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.8, delay: 0.8 }}
                >
                  {/* Blockchain Status */}
                  <div className="flex items-center gap-2">
                    <motion.div
                      className="w-3 h-3 bg-green-400 rounded-full"
                      animate={{
                        scale: [1, 1.2, 1],
                        boxShadow: [
                          '0 0 0 0 rgba(34, 197, 94, 0.7)',
                          '0 0 0 10px rgba(34, 197, 94, 0)',
                          '0 0 0 0 rgba(34, 197, 94, 0)'
                        ]
                      }}
                      transition={{ duration: 2, repeat: Infinity }}
                    />
                    <span className="text-amber-400 text-sm font-semibold">{t('dex.tokenEcosystemLive')}</span>
                  </div>

                  {/* Wallet Connector */}
                  <div className="flex items-center">
                    <WalletConnector />
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>

          {/* Token Utility Action Cards */}
          <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 text-center">
                  {t('dex.whatYouCanDoWithDyo')}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                  {tokenUtilityActions.map((action, idx) => {
                    const ActionIcon = action.icon;
                    return (
                      <motion.button
                        key={action.id}
                        onClick={() => {
                          if (action.link.startsWith('#')) {
                            setActiveTab(action.link.substring(1) as any);
                          } else {
                            navigate(action.link);
                          }
                        }}
                        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 hover:border-amber-400/50 transition-all text-left relative overflow-hidden group"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <div className="absolute top-2 right-2">
                          <span className="text-xs px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full border border-amber-400/30">
                            {action.badge}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mb-4">
                          <div className="p-3 rounded-lg" style={{ backgroundColor: `${action.color}20` }}>
                            <ActionIcon className="w-6 h-6" style={{ color: action.color }} />
                          </div>
                          <ExternalLink className="w-5 h-5 text-gray-400 group-hover:text-amber-400 transition-colors" />
                        </div>
                        <h3 className="text-lg font-bold text-white mb-2">{action.title}</h3>
                        <p className="text-sm text-gray-400">{action.description}</p>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </section>

          {/* Staking Integration Promotion */}
          <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="max-w-7xl mx-auto">
              <motion.div
                className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-400/30 rounded-xl p-6 md:p-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-amber-500/20 rounded-lg">
                      <TrendingUp className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-white mb-1">Stake Your $DYO Tokens</h3>
                      <p className="text-gray-300">Earn passive rewards while supporting the network</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div>
                          <p className="text-3xl font-bold text-amber-400">{stakingAPY}% APY</p>
                          <p className="text-xs text-gray-400">Annual Percentage Yield</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    onClick={() => navigate('/staking')}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all duration-300 flex items-center gap-2 min-h-[44px]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <span>Start Staking</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Navigation Tabs - Responsive */}
          <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
            <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
              <nav className="flex justify-center space-x-1 sm:space-x-2 py-2 sm:py-4 overflow-x-auto">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;

                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`relative flex flex-col items-center gap-1 sm:gap-2 py-2 sm:py-4 px-3 sm:px-6 rounded-lg sm:rounded-xl font-medium text-xs sm:text-sm transition-all duration-300 min-w-[80px] sm:min-w-0 ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {/* Active Background */}
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

                      {/* Content */}
                      <div className="relative z-10 flex flex-col items-center gap-1 sm:gap-2">
                        <Icon
                          size={isMobile ? 18 : 20}
                          style={{ color: isActive ? tab.color : undefined }}
                        />
                        <span className="font-semibold text-center">{tab.label}</span>
                        <span className="text-xs opacity-75 hidden sm:block">{tab.description}</span>
                      </div>
                    </motion.button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                {activeTab === 'dashboard' && <DEXDashboard />}
                {activeTab === 'swap' && (
                  <div className="space-y-6">
                    {/* Recommended Pairs for Streamers */}
                    {streamingEarnings > 0 && (
                      <motion.div
                        className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-400/30 rounded-xl p-4 md:p-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                      >
                        <div className="flex items-center gap-2 mb-4">
                          <Sparkles className="w-5 h-5 text-amber-400" />
                          <h3 className="text-lg font-bold text-white">{t('dex.recommendedPairsForStreamers')}</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          {recommendedPairs.map((pair, idx) => (
                            <div
                              key={idx}
                              className="bg-gray-800/50 rounded-lg p-3 border border-gray-700/50"
                            >
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-semibold text-white">{pair.from}/{pair.to}</span>
                                <span className="text-xs text-amber-400">{pair.liquidity}</span>
                              </div>
                              <div className="text-xs text-gray-400">
                                {t('dex.volume')}: {pair.volume}
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  <div className="flex justify-center">
                    <DEXSwap />
                    </div>
                  </div>
                )}
                {activeTab === 'liquidity' && <DEXLiquidity />}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Tokenomics Education Section */}
          <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="max-w-7xl mx-auto">
              <motion.div
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 md:p-8 border border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-start gap-4 mb-6">
                  <Info className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                  <div className="flex-1">
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-3">$DYO Token Economy</h3>
                    <p className="text-gray-300 mb-4">
                      The $DYO token powers the DUJYO Stream-to-Earn ecosystem. Every stream, view, and play generates $DYO tokens,
                      creating a sustainable economy where creators and listeners earn together.
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="bg-gray-700/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Total Supply</p>
                        <p className="text-xl font-bold text-amber-400">1,000,000,000 $DYO</p>
                      </div>
                      <div className="bg-gray-700/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">Streaming Rewards</p>
                        <p className="text-xl font-bold text-amber-400">40%</p>
                        <p className="text-xs text-gray-500 mt-1">Distributed to creators & listeners</p>
                      </div>
                      <div className="bg-gray-700/30 rounded-lg p-4">
                        <p className="text-sm text-gray-400 mb-1">{t('dex.liquidityPool')}</p>
                        <p className="text-xl font-bold text-amber-400">30%</p>
                        <p className="text-xs text-gray-500 mt-1">For DEX trading pairs</p>
                      </div>
                    </div>
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <p className="text-sm text-gray-400">
                        <strong className="text-amber-300">How Streaming Rewards Fuel the Ecosystem:</strong> When users stream content,
                        they earn $DYO tokens. These tokens can be staked for passive income, traded on the DEX, or used to purchase NFTs.
                        This creates a circular economy that rewards participation and engagement.
                      </p>
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>

          {/* Footer Info */}
          <motion.div
            className="bg-gray-800/30 backdrop-blur-sm border-t border-gray-700/50 mt-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 1 }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap size={16} className="text-amber-400" />
                              <span className="text-amber-400 font-semibold">DYO DEX</span>
                </div>
                <p className="text-gray-400 text-sm">
                  Decentralized Exchange for the DUJYO Ecosystem
                </p>
                <p className="text-gray-500 text-xs mt-1">
                  Built on DYO Blockchain • Powered by Automated Market Making • Stream-to-Earn Integrated
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      </SimpleAppLayout>

      {/* Stream-to-DEX Bridge Modal */}
      <AnimatePresence>
        {showBridgeModal && (
          <>
            <motion.div
              className="fixed inset-0 bg-black/50 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowBridgeModal(false)}
            />
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-amber-400/30"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-amber-400" />
                    Transfer Streaming Earnings
                  </h3>
                  <button
                    onClick={() => setShowBridgeModal(false)}
                    className="text-gray-400 hover:text-white"
                  >
                    ×
                  </button>
                </div>
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-lg p-4">
                    <p className="text-sm text-gray-400 mb-1">Available to Transfer</p>
                    <p className="text-2xl font-bold text-amber-400">{streamingEarnings.toFixed(2)} $DYO</p>
                  </div>
                  <div className="text-sm text-gray-300">
                    <p>{t('dex.transferEarningsDescription')}</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => {
                        // Implement transfer logic
                        setShowBridgeModal(false);
                      }}
                      className="flex-1 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all duration-300"
                    >
                      Transfer Now
                    </button>
                    <button
                      onClick={() => setShowBridgeModal(false)}
                      className="px-6 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </DEXProvider>
  );
};

export default DEXPage;
