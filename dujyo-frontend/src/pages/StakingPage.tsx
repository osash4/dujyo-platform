import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, TrendingUp, Clock, Award, Zap, Lock, Unlock, ArrowRight, Music, Video, Gamepad2, Info, Target, Star, Sparkles, BarChart3, Users, Eye, Percent, Gift } from 'lucide-react';
import SimpleAppLayout from '../components/Layout/SimpleAppLayout';
import { useAuth } from '../auth/AuthContext';
import { useBlockchain } from '../contexts/BlockchainContext';
import { useUnifiedBalance } from '../hooks/useUnifiedBalance';
import { useEventEmitter } from '../contexts/EventBusContext';
import { getApiBaseUrl } from '../utils/apiConfig';

interface StakingInfo {
  totalStaked: number;
  totalRewards: number;
  apy: number;
  stakingPeriod: number;
  nextReward: number;
  dynamicAPY: number;
  apyFactors: {
    streamingVolume: number;
    userActivity: number;
    ecosystemGrowth: number;
  };
}

interface StakingPosition {
  id: string;
  amount: number;
  startDate: string;
  endDate: string;
  rewards: number;
  status: 'active' | 'locked' | 'completed';
}

interface StakingTier {
  id: string;
  name: string;
  minStake: number;
  apy: number;
  benefits: string[];
  color: string;
  icon: React.ElementType;
}

interface StakingGoal {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentProgress: number;
  reward: number;
  unlocked: boolean;
  feature: string;
}

interface RewardBreakdown {
  source: string;
  percentage: number;
  amount: number;
  description: string;
}

const StakingPage: React.FC = () => {
  const { user, getUserRole } = useAuth();
  const { account, refreshBalance } = useBlockchain();
  const { available_dyo, staked, isUpdating, refreshBalance: refreshUnifiedBalance } = useUnifiedBalance();
  const emitEvent = useEventEmitter();
  const [stakingAmount, setStakingAmount] = useState('');
  const [stakingPeriod, setStakingPeriod] = useState(30);
  const [isStaking, setIsStaking] = useState(false);
  const [stakingError, setStakingError] = useState<string | null>(null);
  const [isUnstaking, setIsUnstaking] = useState(false);
  const [message, setMessage] = useState('');
  const [streamingEarnings, setStreamingEarnings] = useState(0);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [showRewardBreakdown, setShowRewardBreakdown] = useState(false);
  
  const [stakingInfo, setStakingInfo] = useState<StakingInfo>({
    totalStaked: 0,
    totalRewards: 0,
    apy: 12.5,
    stakingPeriod: 0,
    nextReward: 0,
    dynamicAPY: 12.5,
    apyFactors: {
      streamingVolume: 0,
      userActivity: 0,
      ecosystemGrowth: 0
    }
  });
  
  const [stakingPositions, setStakingPositions] = useState<StakingPosition[]>([]);
  const [stakingTiers, setStakingTiers] = useState<StakingTier[]>([]);
  const [stakingGoals, setStakingGoals] = useState<StakingGoal[]>([]);
  const [rewardBreakdown, setRewardBreakdown] = useState<RewardBreakdown[]>([]);
  const [realTimeRewards, setRealTimeRewards] = useState(0);

  // Staking Tiers
  useEffect(() => {
    setStakingTiers([
      {
        id: 'streamer',
        name: 'Streamer',
        minStake: 100,
        apy: 12.5,
        benefits: ['Higher content visibility', 'Reduced platform fees (5%)', 'Priority support'],
        color: '#F59E0B',
        icon: Music
      },
      {
        id: 'creator',
        name: 'Creator',
        minStake: 1000,
        apy: 15.0,
        benefits: ['Premium content promotion', 'Reduced platform fees (10%)', 'VIP support', 'Early feature access'],
        color: '#FBBF24',
        icon: Video
      },
      {
        id: 'partner',
        name: 'Partner',
        minStake: 10000,
        apy: 18.0,
        benefits: ['Maximum content visibility', 'Reduced platform fees (15%)', 'Dedicated support', 'Revenue sharing', 'Governance voting'],
        color: '#EA580C',
        icon: Star
      }
    ]);
  }, []);

  // Load streaming earnings
  useEffect(() => {
    if (account || user?.email) {
      fetchStreamingEarnings();
    }
  }, [account, user]);

  // Load staking data and calculate dynamic APY
  useEffect(() => {
    const loadData = async () => {
      if (!account) return;
      
      try {
        // Load staking positions
        const positions = await fetchStakingPositions();
        setStakingPositions(positions);
        
        // Calculate totals
        const totalStaked = positions.reduce((sum, pos) => sum + pos.amount, 0);
        const totalRewards = positions.reduce((sum, pos) => sum + pos.rewards, 0);
        
        // Fetch dynamic APY
        const dynamicAPYData = await fetchDynamicAPY();
        
        setStakingInfo(prev => ({
          ...prev,
          totalStaked,
          totalRewards,
          dynamicAPY: dynamicAPYData.apy,
          apyFactors: dynamicAPYData.factors
        }));

        // Load reward breakdown
        await fetchRewardBreakdown();
        
        // Load staking goals
        await fetchStakingGoals();
        
        // Start real-time reward updates
        startRealTimeRewardUpdates();
      } catch (error) {
        console.error('Error loading staking data:', error);
      }
    };
    
    loadData();
  }, [account]);

  const fetchStreamingEarnings = async () => {
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
      }
    } catch (error) {
      console.error('Error fetching streaming earnings:', error);
    }
  };

  const fetchStakingPositions = async (): Promise<StakingPosition[]> => {
    try {
      const token = localStorage.getItem('jwt_token');
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/staking/positions/${account}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching positions:', error);
    }
    
    // Fallback to mock data
    return [
      {
        id: '1',
        amount: 500,
        startDate: '2024-01-15',
        endDate: '2024-02-15',
        rewards: 25.5,
        status: 'active'
      }
    ];
  };

  const fetchDynamicAPY = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/staking/dynamic-apy/${account}`);
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching dynamic APY:', error);
    }
    
    // Default values
    return {
      apy: 12.5,
      factors: {
        streamingVolume: 0.5,
        userActivity: 0.3,
        ecosystemGrowth: 0.2
      }
    };
  };

  const fetchRewardBreakdown = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/staking/reward-breakdown`);
      
      if (response.ok) {
        const data = await response.json();
        setRewardBreakdown(data.breakdown || []);
      } else {
        // Default breakdown
        setRewardBreakdown([
          {
            source: 'Streaming Fees',
            percentage: 40,
            amount: 0,
            description: 'Distribution from platform streaming fees'
          },
          {
            source: 'Transaction Fees',
            percentage: 30,
            amount: 0,
            description: 'Share of DEX and blockchain transaction fees'
          },
          {
            source: 'Platform Revenue',
            percentage: 20,
            amount: 0,
            description: 'Revenue sharing from platform operations'
          },
          {
            source: 'Ecosystem Growth',
            percentage: 10,
            amount: 0,
            description: 'Funds from ecosystem growth initiatives'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching reward breakdown:', error);
    }
  };

  const fetchStakingGoals = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/staking/goals/${account}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStakingGoals(data.goals || []);
      } else {
        // Default goals
        setStakingGoals([
          {
            id: 'goal-100',
            title: 'First Stake',
            description: 'Stake 100 DYO to unlock premium features',
            targetAmount: 100,
            currentProgress: stakingInfo.totalStaked,
            reward: 10,
            unlocked: stakingInfo.totalStaked >= 100,
            feature: 'Premium Content Upload'
          },
          {
            id: 'goal-1000',
            title: 'Creator Tier',
            description: 'Stake 1,000 DYO for Creator benefits',
            targetAmount: 1000,
            currentProgress: stakingInfo.totalStaked,
            reward: 100,
            unlocked: stakingInfo.totalStaked >= 1000,
            feature: 'Creator Dashboard Access'
          },
          {
            id: 'goal-10000',
            title: 'Partner Status',
            description: 'Stake 10,000 DYO for Partner tier',
            targetAmount: 10000,
            currentProgress: stakingInfo.totalStaked,
            reward: 1000,
            unlocked: stakingInfo.totalStaked >= 10000,
            feature: 'Governance Voting Rights'
          }
        ]);
      }
    } catch (error) {
      console.error('Error fetching staking goals:', error);
    }
  };

  const startRealTimeRewardUpdates = () => {
    const interval = setInterval(() => {
      // Calculate real-time rewards based on current staked amount and APY
      const hourlyReward = (stakingInfo.totalStaked * stakingInfo.dynamicAPY) / (100 * 365 * 24);
      setRealTimeRewards(prev => prev + hourlyReward);
    }, 1000);
    
    return () => clearInterval(interval);
  };

  const handleStakeFromStreaming = async () => {
    if (streamingEarnings <= 0) {
      setStakingError('No streaming earnings available to stake');
      return;
    }
    
    setStakingAmount(streamingEarnings.toString());
    await handleStake();
  };

  const handleStake = async () => {
    if (!stakingAmount || parseFloat(stakingAmount) <= 0) {
      setStakingError('Please enter a valid amount');
      return;
    }
    
    const amount = parseFloat(stakingAmount);
    const availableBalance = streamingEarnings > 0 && parseFloat(stakingAmount) <= streamingEarnings 
      ? streamingEarnings 
      : available_dyo;
    
    if (amount > availableBalance) {
      setStakingError('Insufficient balance');
      return;
    }
    
    setIsStaking(true);
    setStakingError(null);
    setMessage('');
    
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const walletAddress = account || user?.uid;
      console.log('🔍 [STAKING] Attempting to stake with address:', walletAddress);
      
      const response = await fetch(`${getApiBaseUrl()}/stake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          account: walletAddress,
          amount: amount,
          period: stakingPeriod,
          fromStreaming: streamingEarnings > 0 && amount <= streamingEarnings
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `Staking failed: ${response.status}`);
      }
      
      const result = await response.json();
      
      emitEvent({
        type: 'STAKING_SUCCESS',
        data: { 
          amount: amount, 
          period: stakingPeriod,
          txHash: result.txHash || 'N/A',
          rewards: result.expectedRewards || 0
        },
        source: 'StakingPage'
      });
      
      setMessage(`Successfully staked ${stakingAmount} DYO for ${stakingPeriod} days!`);
      setStakingAmount('');
      setStreamingEarnings(0);
      
      if (refreshBalance) {
        await refreshBalance();
      }
      if (refreshUnifiedBalance) {
        await refreshUnifiedBalance();
      }
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setStakingError(errorMessage);
      
      emitEvent({
        type: 'ERROR_OCCURRED',
        data: { 
          error: errorMessage, 
          context: 'staking',
          amount: stakingAmount,
          account 
        },
        source: 'StakingPage'
      });
    } finally {
      setIsStaking(false);
    }
  };

  const handleUnstake = async (positionId: string) => {
    setIsUnstaking(true);
    
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      const response = await fetch(`${getApiBaseUrl()}/unstake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          position_id: positionId,
          user: user?.uid || account
        })
      });
      
      if (!response.ok) {
        throw new Error('Unstaking failed');
      }
      
      setMessage('Successfully unstaked!');
      
      setTimeout(() => {
        window.location.reload();
      }, 2000);
      
    } catch (error) {
      setMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsUnstaking(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-400';
      case 'locked': return 'text-yellow-400';
      case 'completed': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  const getCurrentTier = () => {
    return stakingTiers.find(tier => stakingInfo.totalStaked >= tier.minStake) || stakingTiers[0];
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(2);
  };

  return (
    <SimpleAppLayout>
      <div className="min-h-screen text-white" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Hero Section */}
        <div className="relative py-12 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-red-500 bg-clip-text text-transparent">
                  DUJYO Staking
                </span>
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                Earn rewards by staking your DYO tokens. Higher APY for longer staking periods and active streamers.
              </p>
            </motion.div>

            {/* Streaming-to-Staking Bridge */}
            {streamingEarnings > 0 && (
              <motion.div
                className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-xl p-6 mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4">
                    <div className="p-4 bg-amber-500/20 rounded-lg">
                      <Coins className="w-8 h-8 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">Stake Your Streaming Earnings</h3>
                      <p className="text-gray-300 mb-2">You have {streamingEarnings.toFixed(2)} $DYO from streaming</p>
                      <div className="flex items-center gap-2 text-sm text-amber-400">
                        <Sparkles className="w-4 h-4" />
                        <span>Streaming Powered</span>
                      </div>
                    </div>
                  </div>
                  <motion.button
                    onClick={handleStakeFromStreaming}
                    className="px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all duration-300 flex items-center gap-2 min-h-[44px]"
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    <Lock className="w-5 h-5" />
                    <span>Stake All Earnings</span>
                    <ArrowRight className="w-4 h-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {/* Staking Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
              <motion.div
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Coins className="w-6 h-6 text-amber-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Total Staked</h3>
                </div>
                <p className="text-3xl font-bold text-amber-400">{formatNumber(stakingInfo.totalStaked)} DYO</p>
                <p className="text-xs text-gray-400 mt-1">Current Tier: {getCurrentTier()?.name}</p>
              </motion.div>

              <motion.div
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-green-500/20 rounded-lg">
                    <TrendingUp className="w-6 h-6 text-green-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Total Rewards</h3>
                </div>
                <p className="text-3xl font-bold text-green-400">{formatNumber(stakingInfo.totalRewards + realTimeRewards)} DYO</p>
                <p className="text-xs text-amber-400 mt-1">+{realTimeRewards.toFixed(4)} live</p>
              </motion.div>

              <motion.div
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-amber-400/30"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-amber-500/20 rounded-lg">
                    <Zap className="w-6 h-6 text-amber-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-white">Dynamic APY</h3>
                    <div className="flex items-center gap-1 text-xs text-amber-400">
                      <Sparkles className="w-3 h-3" />
                      <span>Streaming Powered</span>
                    </div>
                  </div>
                </div>
                <p className="text-3xl font-bold text-amber-400">{stakingInfo.dynamicAPY.toFixed(2)}%</p>
                <button
                  onClick={() => setShowRewardBreakdown(!showRewardBreakdown)}
                  className="text-xs text-gray-400 hover:text-amber-400 mt-1"
                >
                  View APY factors
                </button>
              </motion.div>

              <motion.div
                className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-2 bg-purple-500/20 rounded-lg">
                    <Clock className="w-6 h-6 text-purple-400" />
                  </div>
                  <h3 className="text-lg font-semibold text-white">Next Reward</h3>
                </div>
                <p className="text-3xl font-bold text-purple-400">2h 15m</p>
              </motion.div>
            </div>

            {/* APY Factors Breakdown */}
            <AnimatePresence>
              {showRewardBreakdown && (
                <motion.div
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-amber-400/30 mb-8"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                >
                  <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-amber-400" />
                    Dynamic APY Calculation
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Streaming Volume</p>
                      <p className="text-xl font-bold text-amber-400">+{(stakingInfo.apyFactors.streamingVolume * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 mt-1">Based on platform activity</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Your Activity</p>
                      <p className="text-xl font-bold text-amber-400">+{(stakingInfo.apyFactors.userActivity * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 mt-1">Your streaming participation</p>
                    </div>
                    <div className="bg-gray-700/30 rounded-lg p-4">
                      <p className="text-sm text-gray-400 mb-1">Ecosystem Growth</p>
                      <p className="text-xl font-bold text-amber-400">+{(stakingInfo.apyFactors.ecosystemGrowth * 100).toFixed(1)}%</p>
                      <p className="text-xs text-gray-500 mt-1">Platform expansion</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Staking Tiers */}
            <motion.div
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Award className="w-6 h-6 text-amber-400" />
                Staking Tiers & Benefits
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {stakingTiers.map((tier, idx) => {
                  const TierIcon = tier.icon;
                  const isCurrentTier = getCurrentTier()?.id === tier.id;
                  const canUpgrade = stakingInfo.totalStaked < tier.minStake;
                  
                  return (
                    <motion.div
                      key={tier.id}
                      className={`bg-gray-700/30 rounded-xl p-6 border-2 ${
                        isCurrentTier ? 'border-amber-400' : canUpgrade ? 'border-gray-600' : 'border-gray-700'
                      } relative`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.6 + idx * 0.1 }}
                      whileHover={{ scale: 1.02 }}
                    >
                      {isCurrentTier && (
                        <div className="absolute top-2 right-2 px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
                          Current
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="p-3 rounded-lg" style={{ backgroundColor: `${tier.color}20` }}>
                          <TierIcon className="w-6 h-6" style={{ color: tier.color }} />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                          <p className="text-sm text-gray-400">Min: {tier.minStake} DYO</p>
                        </div>
                      </div>
                      <div className="mb-4">
                        <p className="text-2xl font-bold" style={{ color: tier.color }}>{tier.apy}% APY</p>
                      </div>
                      <ul className="space-y-2 mb-4">
                        {tier.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                            <Star className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                      {canUpgrade && (
                        <div className="pt-4 border-t border-gray-600">
                          <p className="text-xs text-gray-400 mb-2">
                            Need {formatNumber(tier.minStake - stakingInfo.totalStaked)} more DYO
                          </p>
                          <div className="w-full bg-gray-600 rounded-full h-2">
                            <motion.div
                              className="h-2 rounded-full bg-amber-500"
                              initial={{ width: 0 }}
                              animate={{ width: `${(stakingInfo.totalStaked / tier.minStake) * 100}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Staking Form */}
            <motion.div
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7 }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Lock className="w-6 h-6 text-amber-400" />
                Stake DYO Tokens
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Amount to Stake (DYO)</label>
                  <input
                    type="number"
                    value={stakingAmount}
                    onChange={(e) => setStakingAmount(e.target.value)}
                    placeholder="0.0"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 min-h-[44px]"
                  />
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-400">
                      Available: {formatNumber(available_dyo + streamingEarnings)} DYO
                      {streamingEarnings > 0 && (
                        <span className="text-amber-400 ml-1">({formatNumber(streamingEarnings)} from streaming)</span>
                      )}
                    </span>
                    <button
                      onClick={() => setStakingAmount((available_dyo + streamingEarnings).toString())}
                      className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                    >
                      Max
                    </button>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Staking Period</label>
                  <select
                    value={stakingPeriod}
                    onChange={(e) => setStakingPeriod(Number(e.target.value))}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400 min-h-[44px]"
                  >
                    <option value={7}>7 days (8% APY)</option>
                    <option value={30}>30 days (12% APY)</option>
                    <option value={90}>90 days (18% APY)</option>
                    <option value={365}>365 days (25% APY)</option>
                  </select>
                  <p className="text-xs text-gray-400 mt-2">
                    Longer periods = Higher rewards
                  </p>
                </div>
              </div>
              
              <div className="mt-6">
                <button
                  onClick={handleStake}
                  disabled={isStaking || !stakingAmount}
                  className="w-full py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-amber-500/25 disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                >
                  {isStaking ? 'Staking...' : `Stake ${stakingAmount || '0'} DYO`}
                </button>
              </div>
              
              {stakingError && (
                <motion.div
                  className="mt-4 p-4 rounded-lg bg-red-500/20 border border-red-500/50 text-red-400"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {stakingError}
                </motion.div>
              )}
              
              {message && (
                <motion.div
                  className={`mt-4 p-4 rounded-lg ${
                    message.includes('Error') 
                      ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                      : 'bg-green-500/20 border border-green-500/50 text-green-400'
                  }`}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {message}
                </motion.div>
              )}
            </motion.div>

            {/* Reward Breakdown */}
            <motion.div
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Info className="w-6 h-6 text-amber-400" />
                  Reward Breakdown Transparency
                </h2>
                <button
                  onClick={() => setShowRewardBreakdown(!showRewardBreakdown)}
                  className="text-sm text-amber-400 hover:text-amber-300"
                >
                  {showRewardBreakdown ? 'Hide' : 'Show'} Details
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {rewardBreakdown.map((source, idx) => (
                  <div key={idx} className="bg-gray-700/30 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-semibold text-white">{source.source}</p>
                      <p className="text-lg font-bold text-amber-400">{source.percentage}%</p>
                    </div>
                    <p className="text-xs text-gray-400">{source.description}</p>
                    <div className="mt-2 w-full bg-gray-600 rounded-full h-2">
                      <motion.div
                        className="h-2 rounded-full bg-amber-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${source.percentage}%` }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Staking Goals & Milestones */}
            <motion.div
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.9 }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Target className="w-6 h-6 text-amber-400" />
                Staking Goals & Milestones
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {stakingGoals.map((goal, idx) => {
                  const progress = Math.min((goal.currentProgress / goal.targetAmount) * 100, 100);
                  
                  return (
                    <motion.div
                      key={goal.id}
                      className={`bg-gray-700/30 rounded-lg p-6 border-2 ${
                        goal.unlocked ? 'border-amber-400' : 'border-gray-600'
                      }`}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 1.0 + idx * 0.1 }}
                    >
                      <div className="flex items-center gap-3 mb-4">
                        {goal.unlocked ? (
                          <Award className="w-6 h-6 text-amber-400" />
                        ) : (
                          <Target className="w-6 h-6 text-gray-400" />
                        )}
                        <div className="flex-1">
                          <h3 className="font-bold text-white">{goal.title}</h3>
                          <p className="text-xs text-gray-400">{goal.description}</p>
                        </div>
                        {goal.unlocked && (
                          <div className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
                            Unlocked
                          </div>
                        )}
                      </div>
                      <div className="mb-4">
                        <div className="flex justify-between text-sm mb-2">
                          <span className="text-gray-400">Progress</span>
                          <span className="text-white font-semibold">
                            {formatNumber(goal.currentProgress)} / {formatNumber(goal.targetAmount)} DYO
                          </span>
                        </div>
                        <div className="w-full bg-gray-600 rounded-full h-3">
                          <motion.div
                            className={`h-3 rounded-full ${goal.unlocked ? 'bg-amber-500' : 'bg-amber-400'}`}
                            initial={{ width: 0 }}
                            animate={{ width: `${progress}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-4 border-t border-gray-600">
                        <div>
                          <p className="text-xs text-gray-400">Unlocks</p>
                          <p className="text-sm font-semibold text-white">{goal.feature}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">Reward</p>
                          <p className="text-sm font-bold text-amber-400">{goal.reward} $DYO</p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Staking-Enhanced Streaming Features */}
            <motion.div
              className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-400/30 rounded-xl p-8 mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.1 }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Sparkles className="w-6 h-6 text-amber-400" />
                Benefits for Stakers in Streaming Platform
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-gray-800/50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Eye className="w-6 h-6 text-amber-400" />
                    <h3 className="font-bold text-white">Higher Visibility</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    Your content gets prioritized in search results and recommendations, reaching more listeners.
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Percent className="w-6 h-6 text-amber-400" />
                    <h3 className="font-bold text-white">Reduced Fees</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    Lower platform fees based on your staking tier. Save more on every transaction.
                  </p>
                </div>
                <div className="bg-gray-800/50 rounded-lg p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Users className="w-6 h-6 text-amber-400" />
                    <h3 className="font-bold text-white">Priority Support</h3>
                  </div>
                  <p className="text-sm text-gray-300">
                    Get faster response times and dedicated support channels for all your needs.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Staking Positions */}
            <motion.div
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.2 }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                <Award className="w-6 h-6 text-green-400" />
                Your Staking Positions
              </h2>
              
              {stakingPositions.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Coins className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>No staking positions found</p>
                  <p className="text-sm mt-2">Start staking to earn rewards!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stakingPositions.map((position) => (
                    <motion.div
                      key={position.id}
                      className="bg-gray-700/30 rounded-lg p-6 border border-gray-600/30"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                    >
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                        <div>
                          <p className="text-sm text-gray-400">Amount</p>
                          <p className="text-lg font-semibold text-white">{position.amount} DYO</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Start Date</p>
                          <p className="text-white">{formatDate(position.startDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">End Date</p>
                          <p className="text-white">{formatDate(position.endDate)}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">Rewards</p>
                          <p className="text-lg font-semibold text-green-400">{position.rewards.toFixed(2)} DYO</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(position.status)} bg-gray-800/50`}>
                            {position.status}
                          </span>
                          {position.status === 'active' && (
                            <button
                              onClick={() => handleUnstake(position.id)}
                              disabled={isUnstaking}
                              className="px-4 py-2 bg-red-500/20 border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50 min-h-[44px]"
                            >
                              <Unlock className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          </div>
        </div>
      </div>
    </SimpleAppLayout>
  );
};

export default StakingPage;
