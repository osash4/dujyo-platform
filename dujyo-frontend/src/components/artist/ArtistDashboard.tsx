import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  DollarSign, 
  Users, 
  Play, 
  Calendar,
  MapPin,
  Music,
  Award,
  Clock,
  ArrowUpRight,
  TrendingUp,
  Video,
  Gamepad,
  Coins,
  Target,
  Sparkles,
  Zap,
  BarChart3,
  Lightbulb,
  Lock,
  Percent,
  Crown,
  Bell,
  Activity,
  Eye,
  Timer,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useBlockchain } from '../../contexts/BlockchainContext';
import { useUnifiedBalance } from '../../hooks/useUnifiedBalance';
import { useLanguage } from '../../contexts/LanguageContext';
import QuickDexCard from './QuickDexCard';
import { getApiBaseUrl } from '../../utils/apiConfig';

interface ContentTypeMetrics {
  earnings: number;
  engagement: number; // streams, views, or hours
  audience: number; // listeners, viewers, or players
  growth: number;
  roi?: number; // Return on investment
  earningRate?: number; // DYO per stream/view/hour
}

interface ArtistMetrics {
  // MÉTRICAS UNIFICADAS
  totalEarnings: number;
  totalEngagement: number; // Total streams + views + hours
  totalAudience: number; // Total unique users across all platforms
  
  // BREAKDOWN POR TIPO DE CONTENIDO
  music: ContentTypeMetrics;
  video: ContentTypeMetrics;
  gaming: ContentTypeMetrics;
  
  // MÉTRICAS LEGACY (mantener para compatibilidad)
  monthlyEarnings: number;
  totalStreams: number;
  monthlyStreams: number;
  uniqueListeners: number;
  monthlyListeners: number;
  catalogSize: number;
  topSongs: Array<{
    id: string;
    title: string;
    streams: number;
    earnings: number;
  }>;
  recentActivity: Array<{
    id: string;
    type: 'stream' | 'purchase' | 'royalty';
    amount?: number;
    description: string;
    timestamp: Date;
  }>;
  nextPayout: Date;
  payoutAmount: number;
  topLocations: Array<{
    city: string;
    country: string;
    streams: number;
    percentage: number;
  }>;
  earningsGrowth: number;
  streamsGrowth: number;
}

interface EarningPrediction {
  weekly: number;
  monthly: number;
  quarterly: number;
  confidence: number;
}

interface EarningGoal {
  id: string;
  target: number;
  current: number;
  deadline: Date;
  label: string;
}

interface OptimizationTip {
  id: string;
  title: string;
  description: string;
  impact: string;
  category: 'content' | 'engagement' | 'monetization';
  priority: 'high' | 'medium' | 'low';
}

interface RealTimeEarning {
  id: string;
  contentTitle: string;
  amount: number;
  timestamp: Date;
  type: 'music' | 'video' | 'gaming';
}

interface StakingInfo {
  totalStaked: number;
  apy: number;
  rewards: number;
  tier: 'streamer' | 'creator' | 'partner';
  benefits: string[];
}

interface AudienceMetric {
  earningsPerFan: number;
  topFans: Array<{
    id: string;
    name: string;
    engagement: number;
    earnings: number;
  }>;
  loyaltyScore: number;
}

const ArtistDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { user, getUserRole } = useAuth();
  const { account } = useBlockchain();
  const { available_dyo, staked, isUpdating } = useUnifiedBalance();
  const [metrics, setMetrics] = useState<ArtistMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | '1y'>('30d');
  const [earningPredictions, setEarningPredictions] = useState<EarningPrediction | null>(null);
  const [earningGoals, setEarningGoals] = useState<EarningGoal[]>([]);
  const [optimizationTips, setOptimizationTips] = useState<OptimizationTip[]>([]);
  const [stakingInfo, setStakingInfo] = useState<StakingInfo | null>(null);
  const [realTimeEarnings, setRealTimeEarnings] = useState<RealTimeEarning[]>([]);
  const [audienceMetrics, setAudienceMetrics] = useState<AudienceMetric | null>(null);
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [newGoalTarget, setNewGoalTarget] = useState('');
  const [newGoalLabel, setNewGoalLabel] = useState('');
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    if (user?.uid) {
      fetchArtistMetrics();
      fetchStakingInfo();
      fetchOptimizationTips();
      fetchAudienceMetrics();
      setupWebSocket();
    }
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedPeriod, user?.uid, account]);

  // Real-time earnings update interval
  useEffect(() => {
    const interval = setInterval(() => {
      fetchRealTimeEarnings();
    }, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [metrics]);

  const setupWebSocket = () => {
    try {
      const wsUrl = getApiBaseUrl().replace('http', 'ws') + '/ws/earnings';
      const ws = new WebSocket(wsUrl);
      
      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'earning_update') {
          const newEarning: RealTimeEarning = {
            id: Date.now().toString(),
            contentTitle: data.contentTitle || 'Unknown',
            amount: data.amount || 0,
            timestamp: new Date(),
            type: data.contentType || 'music'
          };
          setRealTimeEarnings(prev => [newEarning, ...prev.slice(0, 9)]);
          
          // Show notification
          if (data.amount > 0) {
            showNotification(`+${data.amount.toFixed(3)} $DYO from ${data.contentTitle}`);
          }
        }
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Error setting up WebSocket:', error);
    }
  };

  const showNotification = (message: string) => {
    // Create a temporary notification element
    const notification = document.createElement('div');
    notification.className = 'fixed top-4 right-4 bg-amber-500 text-white px-4 py-2 rounded-lg shadow-lg z-50';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.remove();
    }, 3000);
  };

  const fetchArtistMetrics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      let walletAddress: string | undefined = user?.uid;
      
      if (!walletAddress || !walletAddress.startsWith('DU')) {
        walletAddress = localStorage.getItem('dujyo_wallet_account') || undefined;
      }
      
      if (!walletAddress || !walletAddress.startsWith('DU')) {
        const storedWallet = localStorage.getItem('dujyo_wallet');
        if (storedWallet) {
          try {
            const wallet = JSON.parse(storedWallet);
            if (wallet.address && wallet.address.startsWith('DU')) {
              walletAddress = wallet.address;
            }
          } catch (e) {
            console.warn('Error parsing dujyo_wallet:', e);
          }
        }
      }

      if (!walletAddress || !walletAddress.startsWith('DU')) {
        console.warn('❌ [ARTIST] No valid native blockchain address available');
        setLoading(false);
        return;
      }

      const headers: HeadersInit = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };
      const apiBaseUrl = getApiBaseUrl();
      
      const [analyticsResponse, royaltiesResponse] = await Promise.all([
        fetch(`${apiBaseUrl}/api/v1/analytics/artist/${walletAddress}`, { headers }),
        fetch(`${apiBaseUrl}/api/v1/royalties/artist/${walletAddress}`, { headers })
      ]);

      if (!analyticsResponse.ok || !royaltiesResponse.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const analyticsData = await analyticsResponse.json();
      const royaltiesData = await royaltiesResponse.json();

      const totalEarnings = royaltiesData.total_earned || 0;
      const pendingPayout = royaltiesData.pending_payout || 0;
      const totalStreams = analyticsData.total_streams || 0;
      const uniqueListeners = analyticsData.audience_demographics?.total_listeners || Math.floor(totalStreams / 100) || 0;
      
      // Enhanced metrics with ROI and earning rates
      const musicEarnings = totalEarnings * 0.7;
      const videoEarnings = totalEarnings * 0.2;
      const gamingEarnings = totalEarnings * 0.1;
      
      const musicStreams = totalStreams;
      const videoViews = Math.floor(totalStreams * 0.3);
      const gamingHours = Math.floor(totalStreams * 0.1);
      
      const musicListeners = uniqueListeners;
      const videoViewers = Math.floor(uniqueListeners * 0.4);
      const gamingPlayers = Math.floor(uniqueListeners * 0.2);
      
      const totalEngagement = musicStreams + videoViews + gamingHours;
      const totalAudience = musicListeners + videoViewers + gamingPlayers;

      const topSongs = (analyticsData.top_tracks || []).slice(0, 5).map((track: any) => ({
        id: track.track_id || '',
        title: track.track_name || 'Unknown',
        streams: track.streams || 0,
        earnings: track.revenue || 0
      }));

      const topLocations = (analyticsData.audience_demographics?.top_countries || []).slice(0, 5).map((country: any) => ({
        city: country.country?.split(' ')[0] || 'Unknown',
        country: country.country || 'Unknown',
        streams: (country.listeners || 0) * 10,
        percentage: country.percentage || 0
      }));

      const recentPayments = (royaltiesData.payment_history || []).slice(0, 4).map((payment: any) => ({
        id: payment.payment_id || '',
        type: payment.source === 'streaming' ? 'stream' : 'royalty' as const,
        amount: payment.amount || 0,
        description: `${payment.source} payment`,
        timestamp: new Date(payment.date || Date.now())
      }));

      const earningsGrowth = totalEarnings > 0 ? 0 : 0;
      const streamsGrowth = totalStreams > 0 ? 0 : 0;
      const catalogSize = analyticsData.total_tracks || 0;

      // Calculate ROI and earning rates
      const musicROI = musicStreams > 0 ? (musicEarnings / musicStreams) * 100 : 0;
      const videoROI = videoViews > 0 ? (videoEarnings / videoViews) * 100 : 0;
      const gamingROI = gamingHours > 0 ? (gamingEarnings / gamingHours) * 100 : 0;

      const metrics: ArtistMetrics = {
        totalEarnings: totalEarnings,
        totalEngagement: totalEngagement,
        totalAudience: totalAudience,
        
        music: {
          earnings: musicEarnings,
          engagement: musicStreams,
          audience: musicListeners,
          growth: streamsGrowth,
          roi: musicROI,
          earningRate: musicStreams > 0 ? musicEarnings / musicStreams : 0.01
        },
        video: {
          earnings: videoEarnings,
          engagement: videoViews,
          audience: videoViewers,
          growth: 0,
          roi: videoROI,
          earningRate: videoViews > 0 ? videoEarnings / videoViews : 0.02
        },
        gaming: {
          earnings: gamingEarnings,
          engagement: gamingHours,
          audience: gamingPlayers,
          growth: 0,
          roi: gamingROI,
          earningRate: gamingHours > 0 ? gamingEarnings / gamingHours : 0.015
        },
        
        monthlyEarnings: totalEarnings * 0.3,
        totalStreams: totalStreams,
        monthlyStreams: Math.floor(totalStreams * 0.3),
        uniqueListeners: uniqueListeners,
        monthlyListeners: Math.floor(uniqueListeners * 0.3),
        catalogSize: catalogSize,
        topSongs: topSongs.length > 0 ? topSongs : [],
        recentActivity: recentPayments.length > 0 ? recentPayments : [],
        nextPayout: royaltiesData.last_payout_date 
          ? new Date(new Date(royaltiesData.last_payout_date).getTime() + 30 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        payoutAmount: pendingPayout,
        topLocations: topLocations.length > 0 ? topLocations : [],
        earningsGrowth: earningsGrowth,
        streamsGrowth: streamsGrowth,
      };
      
      setMetrics(metrics);
      calculateEarningPredictions(metrics);
      loadEarningGoals(metrics.totalEarnings);
    } catch (error) {
      console.error('Error fetching artist metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateEarningPredictions = (metrics: ArtistMetrics) => {
    // Calculate predictions based on current trends
    const weeklyRate = metrics.monthlyEarnings / 4;
    const monthlyRate = metrics.monthlyEarnings;
    const quarterlyRate = metrics.monthlyEarnings * 3;
    
    const predictions: EarningPrediction = {
      weekly: weeklyRate,
      monthly: monthlyRate,
      quarterly: quarterlyRate,
      confidence: metrics.totalEarnings > 0 ? 85 : 50
    };
    
    setEarningPredictions(predictions);
  };

  const loadEarningGoals = (currentEarnings: number) => {
    // Load or create default goals
    const goals: EarningGoal[] = [
      {
        id: '1',
        target: 1000,
        current: currentEarnings,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        label: t('artist.monthlyGoal')
      },
      {
        id: '2',
        target: 5000,
        current: currentEarnings,
        deadline: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        label: t('artist.quarterlyGoal')
      }
    ];
    setEarningGoals(goals);
  };

  const fetchStakingInfo = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const walletAddress = account || user?.uid;
      
      if (!walletAddress) return;
      
      const response = await fetch(`${apiBaseUrl}/api/staking/info/${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setStakingInfo({
          totalStaked: data.totalStaked || staked,
          apy: data.apy || 12.5,
          rewards: data.rewards || 0,
          tier: data.tier || 'streamer',
          benefits: data.benefits || []
        });
      } else {
        // Default staking info
        setStakingInfo({
          totalStaked: staked,
          apy: 12.5,
          rewards: 0,
          tier: staked >= 10000 ? 'partner' : staked >= 1000 ? 'creator' : 'streamer',
          benefits: []
        });
      }
    } catch (error) {
      console.error('Error fetching staking info:', error);
    }
  };

  const fetchOptimizationTips = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const walletAddress = account || user?.uid;
      
      const response = await fetch(`${apiBaseUrl}/api/artist/optimization-tips/${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setOptimizationTips(data.tips || []);
      } else {
        // Default optimization tips based on metrics
        const tips: OptimizationTip[] = [
          {
            id: '1',
            title: t('artist.uploadMoreVideoContent'),
            description: t('artist.videoContentHigherMonetization'),
            impact: t('artist.impact40PercentEarnings'),
            category: 'content',
            priority: 'high'
          },
          {
            id: '2',
            title: t('artist.engageTopFans'),
            description: t('artist.topFansGenerateMoreStreams'),
            impact: t('artist.impact25PercentEngagement'),
            category: 'engagement',
            priority: 'high'
          },
          {
            id: '3',
            title: t('artist.releaseConsistently'),
            description: t('artist.weeklyReleaseHigherRetention'),
            impact: t('artist.impact30PercentAudience'),
            category: 'monetization',
            priority: 'medium'
          }
        ];
        setOptimizationTips(tips);
      }
    } catch (error) {
      console.error('Error fetching optimization tips:', error);
    }
  };

  const fetchAudienceMetrics = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const walletAddress = account || user?.uid;
      
      const response = await fetch(`${apiBaseUrl}/api/artist/audience-metrics/${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAudienceMetrics(data);
      } else {
        // Default audience metrics
        if (metrics) {
          const earningsPerFan = metrics.totalAudience > 0 
            ? metrics.totalEarnings / metrics.totalAudience 
            : 0;
          setAudienceMetrics({
            earningsPerFan,
            topFans: [],
            loyaltyScore: 75
          });
        }
      }
    } catch (error) {
      console.error('Error fetching audience metrics:', error);
    }
  };

  const fetchRealTimeEarnings = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const walletAddress = account || user?.uid;
      
      const response = await fetch(`${apiBaseUrl}/api/artist/realtime-earnings/${walletAddress}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.earnings && data.earnings.length > 0) {
          const formattedEarnings: RealTimeEarning[] = data.earnings.map((e: any) => ({
            id: e.id || Date.now().toString(),
            contentTitle: e.contentTitle || 'Unknown',
            amount: e.amount || 0,
            timestamp: new Date(e.timestamp || Date.now()),
            type: e.type || 'music'
          }));
          setRealTimeEarnings(formattedEarnings);
        }
      }
    } catch (error) {
      console.error('Error fetching real-time earnings:', error);
    }
  };

  const addEarningGoal = () => {
    if (!newGoalTarget || !newGoalLabel) return;
    
    const newGoal: EarningGoal = {
      id: Date.now().toString(),
      target: parseFloat(newGoalTarget),
      current: metrics?.totalEarnings || 0,
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      label: newGoalLabel
    };
    
    setEarningGoals([...earningGoals, newGoal]);
    setNewGoalTarget('');
    setNewGoalLabel('');
    setShowGoalModal(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toFixed(2);
  };

  const formatDYO = (amount: number) => {
    return `${formatNumber(amount)} $DYO`;
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'royalty': return <DollarSign className="w-4 h-4 text-green-500" />;
      case 'stream': return <Play className="w-4 h-4 text-blue-500" />;
      case 'purchase': return <Award className="w-4 h-4 text-purple-500" />;
      default: return <Music className="w-4 h-4 text-gray-500" />;
    }
  };

  const getContentTypeIcon = (type: 'music' | 'video' | 'gaming') => {
    switch (type) {
      case 'music': return <Music className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'gaming': return <Gamepad className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-amber-500"></div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-white mb-4">{t('artist.noDataAvailable')}</h2>
          <p className="text-gray-400">{t('artist.unableToLoadMetrics')}</p>
        </div>
      </div>
    );
  }

  const earningRate = metrics.monthlyEarnings > 0 
    ? metrics.monthlyEarnings / 30 
    : 0; // DYO per day

  return (
    <div className="p-6 space-y-6" data-tour="dashboard">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{t('artist.artistDashboard')}</h1>
          <p className="text-gray-400 mt-1">{t('artist.welcomeBack').replace('{{name}}', user?.displayName || '')}</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value as any)}
            className="bg-gray-800 text-white px-4 py-2 rounded-lg border border-gray-700 focus:border-amber-500 focus:outline-none"
          >
            <option value="7d">{t('artist.last7Days')}</option>
            <option value="30d">{t('artist.last30Days')}</option>
            <option value="90d">{t('artist.last90Days')}</option>
            <option value="1y">{t('artist.lastYear')}</option>
          </select>
        </div>
      </div>

      {/* DYO Token Economy Dashboard */}
      <motion.div
        className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-xl p-6"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <Coins className="w-6 h-6 text-amber-400" />
            {t('artist.dyoTokenEconomy')}
          </h2>
          <div className="flex items-center gap-2 text-sm text-amber-400">
            <Sparkles className="w-4 h-4" />
            <span>{t('artist.streamToEarnActive')}</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">{t('artist.availableBalance')}</p>
            <p className="text-2xl font-bold text-amber-400">{formatDYO(available_dyo)}</p>
            {isUpdating && <p className="text-xs text-gray-500 mt-1">{t('common.loading')}...</p>}
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">{t('artist.staked')}</p>
            <p className="text-2xl font-bold text-amber-400">{formatDYO(staked)}</p>
            {stakingInfo && (
              <p className="text-xs text-amber-400 mt-1">{stakingInfo.apy}% APY</p>
            )}
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">{t('artist.earningRate')}</p>
            <p className="text-2xl font-bold text-amber-400">{formatDYO(earningRate)}/{t('common.day')}</p>
            <p className="text-xs text-gray-500 mt-1">~{formatDYO(earningRate * 7)}/{t('common.week')}</p>
          </div>
          <div className="bg-gray-800/50 rounded-lg p-4">
            <p className="text-sm text-gray-400 mb-1">{t('artist.totalEarnings')}</p>
            <p className="text-2xl font-bold text-amber-400">{formatDYO(metrics.totalEarnings)}</p>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3 text-green-400" />
              <span className="text-xs text-green-400">+{metrics.earningsGrowth}%</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Earning Predictions & Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <motion.div
          className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              {t('artist.earningPredictions')}
            </h3>
            <div className="px-2 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
              {earningPredictions?.confidence || 0}% {t('artist.confidence')}
            </div>
          </div>
          {earningPredictions && (
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-400">{t('artist.weeklyProjection')}</p>
                  <p className="text-lg font-bold text-amber-400">{formatDYO(earningPredictions.weekly)}</p>
                </div>
                <Calendar className="w-8 h-8 text-gray-500" />
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-400">{t('artist.monthlyProjection')}</p>
                  <p className="text-lg font-bold text-amber-400">{formatDYO(earningPredictions.monthly)}</p>
                </div>
                <Calendar className="w-8 h-8 text-gray-500" />
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-700/50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-400">{t('artist.quarterlyProjection')}</p>
                  <p className="text-lg font-bold text-amber-400">{formatDYO(earningPredictions.quarterly)}</p>
                </div>
                <Calendar className="w-8 h-8 text-gray-500" />
              </div>
            </div>
          )}
        </motion.div>

        <motion.div
          className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              {t('artist.earningGoals')}
            </h3>
            <button
              onClick={() => setShowGoalModal(true)}
              className="px-3 py-1 bg-amber-500 text-white rounded-lg text-sm hover:bg-amber-600 transition-colors"
            >
              + {t('artist.addGoal')}
            </button>
          </div>
          <div className="space-y-4">
            {earningGoals.map((goal) => {
              const progress = Math.min((goal.current / goal.target) * 100, 100);
              return (
                <div key={goal.id} className="p-3 bg-gray-700/50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <p className="text-sm font-semibold text-white">{goal.label}</p>
                    <p className="text-xs text-gray-400">
                      {formatDYO(goal.current)} / {formatDYO(goal.target)}
                    </p>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-2 mb-2">
                    <motion.div
                      className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600"
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 0.5 }}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {progress.toFixed(0)}% {t('artist.complete')} • {Math.ceil((goal.deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} {t('common.days')} {t('artist.left')}
                  </p>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Content Optimization Recommendations */}
      <motion.div
        className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h3 className="text-xl font-bold text-white">{t('artist.aiOptimizationTips')}</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {optimizationTips.map((tip, idx) => (
            <motion.div
              key={tip.id}
              className={`p-4 rounded-lg border-2 ${
                tip.priority === 'high' 
                  ? 'bg-gradient-to-r from-amber-500/20 to-orange-600/20 border-amber-400/30'
                  : 'bg-gray-700/50 border-gray-600'
              }`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-white text-sm">{tip.title}</h4>
                {tip.priority === 'high' && (
                  <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                )}
              </div>
              <p className="text-xs text-gray-400 mb-2">{tip.description}</p>
              <div className="flex items-center gap-1 text-xs text-amber-400 font-semibold">
                <TrendingUp className="w-3 h-3" />
                <span>{tip.impact}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Staking Benefits for Artists */}
      {stakingInfo && (
        <motion.div
          className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-400/30 rounded-xl p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white flex items-center gap-2">
              <Lock className="w-5 h-5 text-amber-400" />
              {t('artist.stakingBenefits')}
            </h3>
            <div className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold">
              {stakingInfo.tier.toUpperCase()} {t('artist.tier')}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">{t('artist.totalStaked')}</p>
              <p className="text-2xl font-bold text-amber-400">{formatDYO(stakingInfo.totalStaked)}</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">{t('artist.currentApy')}</p>
              <p className="text-2xl font-bold text-amber-400">{stakingInfo.apy}%</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">{t('artist.stakingRewards')}</p>
              <p className="text-2xl font-bold text-amber-400">{formatDYO(stakingInfo.rewards)}</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/staking"
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all flex items-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>{t('artist.stakeMoreDyo')}</span>
              <ArrowRight className="w-4 h-4" />
            </a>
            <div className="text-sm text-gray-400">
              {t('artist.platformBenefits')}
            </div>
          </div>
        </motion.div>
      )}

      {/* Real-Time Earning Streams */}
      <motion.div
        className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white flex items-center gap-2">
            <Activity className="w-5 h-5 text-amber-400" />
            {t('artist.realTimeEarningStreams')}
          </h3>
          <div className="flex items-center gap-2 text-sm text-green-400">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            <span>{t('artist.live')}</span>
          </div>
        </div>
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {realTimeEarnings.length > 0 ? (
            realTimeEarnings.map((earning) => (
              <motion.div
                key={earning.id}
                className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <div className="flex items-center gap-3">
                  {getContentTypeIcon(earning.type)}
                  <div>
                    <p className="text-sm font-semibold text-white">{earning.contentTitle}</p>
                    <p className="text-xs text-gray-400">
                      {earning.timestamp.toLocaleTimeString()}
                    </p>
                  </div>
                </div>
                <p className="text-sm font-bold text-green-400">+{formatDYO(earning.amount)}</p>
              </motion.div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-400">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>{t('artist.noRecentEarnings')}</p>
              <p className="text-xs mt-1">{t('artist.earningsWillAppearRealTime')}</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Unified Metrics Header */}
      <div className="mb-6" data-tour="metrics">
        <h2 className="text-xl font-bold text-white mb-4">{t('artist.multistreamingOverview')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">{t('artist.totalEarnings')}</p>
                <p className="text-3xl font-bold text-white">{formatDYO(metrics.totalEarnings)}</p>
                <p className="text-green-200 text-xs mt-2">{t('artist.allContentTypes')}</p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 text-green-200 mr-1" />
                  <span className="text-green-200 text-sm">+{metrics.earningsGrowth}%</span>
                </div>
              </div>
              <DollarSign className="w-12 h-12 text-green-200" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gradient-to-r from-orange-600 to-blue-700 p-6 rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">{t('artist.totalEngagement')}</p>
                <p className="text-3xl font-bold text-white">{formatNumber(metrics.totalEngagement)}</p>
                <p className="text-blue-200 text-xs mt-2">{t('artist.streamsViewsHours')}</p>
                <div className="flex items-center mt-2">
                  <TrendingUp className="w-4 h-4 text-blue-200 mr-1" />
                  <span className="text-blue-200 text-sm">+{metrics.streamsGrowth}%</span>
                </div>
              </div>
              <TrendingUp className="w-12 h-12 text-blue-200" />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 rounded-xl shadow-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">{t('artist.totalAudience')}</p>
                <p className="text-3xl font-bold text-white">{formatNumber(metrics.totalAudience)}</p>
                <p className="text-purple-200 text-xs mt-2">{t('artist.uniqueUsersAcrossPlatforms')}</p>
                <div className="flex items-center mt-2">
                  <ArrowUpRight className="w-4 h-4 text-purple-200 mr-1" />
                  <span className="text-purple-200 text-sm">+12.5%</span>
                </div>
              </div>
              <Users className="w-12 h-12 text-purple-200" />
            </div>
          </motion.div>
        </div>
      </div>

      {/* Multistreaming Performance Analytics */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-white mb-4">{t('artist.contentTypePerformanceRoi')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Music Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                <Music className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{t('artist.music')}</h3>
                <p className="text-gray-400 text-sm">{t('artist.streamsListeners')}</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">{t('artist.earnings')}:</span>
                <span className="text-green-400 font-semibold">{formatDYO(metrics.music.earnings)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">{t('artist.streams')}:</span>
                <span className="text-white font-semibold">{formatNumber(metrics.music.engagement)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">{t('artist.earningRate')}:</span>
                <span className="text-amber-400 font-semibold">{formatDYO(metrics.music.earningRate || 0)}/{t('artist.stream')}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">{t('artist.roi')}:</span>
                <span className="text-blue-400 font-semibold">{metrics.music.roi?.toFixed(2) || '0.00'}%</span>
              </div>
              <div className="flex items-center mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-green-400 text-sm">+{metrics.music.growth}%</span>
              </div>
            </div>
          </motion.div>

          {/* Video Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
            className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-lg flex items-center justify-center mr-3">
                <Video className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Video</h3>
                <p className="text-gray-400 text-sm">Views & Viewers</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Earnings:</span>
                <span className="text-green-400 font-semibold">{formatDYO(metrics.video.earnings)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Views:</span>
                <span className="text-white font-semibold">{formatNumber(metrics.video.engagement)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Earning Rate:</span>
                <span className="text-amber-400 font-semibold">{formatDYO(metrics.video.earningRate || 0)}/view</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">ROI:</span>
                <span className="text-blue-400 font-semibold">{metrics.video.roi?.toFixed(2) || '0.00'}%</span>
              </div>
              <div className="flex items-center mt-2">
                <ArrowUpRight className="w-4 h-4 text-blue-400 mr-1" />
                <span className="text-blue-400 text-sm">+{metrics.video.growth}%</span>
              </div>
            </div>
          </motion.div>

          {/* Gaming Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.6 }}
            className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
          >
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center mr-3">
                <Gamepad className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Gaming</h3>
                <p className="text-gray-400 text-sm">Hours & Players</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Earnings:</span>
                <span className="text-green-400 font-semibold">{formatDYO(metrics.gaming.earnings)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Hours:</span>
                <span className="text-white font-semibold">{formatNumber(metrics.gaming.engagement)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Earning Rate:</span>
                <span className="text-amber-400 font-semibold">{formatDYO(metrics.gaming.earningRate || 0)}/hour</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">ROI:</span>
                <span className="text-blue-400 font-semibold">{metrics.gaming.roi?.toFixed(2) || '0.00'}%</span>
              </div>
              <div className="flex items-center mt-2">
                <ArrowUpRight className="w-4 h-4 text-green-400 mr-1" />
                <span className="text-green-400 text-sm">+{metrics.gaming.growth}%</span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Audience Monetization Metrics */}
      {audienceMetrics && (
        <motion.div
          className="bg-gray-800 p-6 rounded-xl shadow-lg border border-gray-700"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-amber-400" />
            Audience Monetization Metrics
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Earnings per Fan</p>
              <p className="text-2xl font-bold text-amber-400">{formatDYO(audienceMetrics.earningsPerFan)}</p>
              <p className="text-xs text-gray-500 mt-1">Average per listener/viewer/player</p>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Loyalty Score</p>
              <p className="text-2xl font-bold text-amber-400">{audienceMetrics.loyaltyScore}/100</p>
              <div className="w-full bg-gray-600 rounded-full h-2 mt-2">
                <motion.div
                  className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600"
                  initial={{ width: 0 }}
                  animate={{ width: `${audienceMetrics.loyaltyScore}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Top Fans</p>
              <p className="text-2xl font-bold text-white">{audienceMetrics.topFans.length}</p>
              <p className="text-xs text-gray-500 mt-1">High engagement users</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Legacy Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gradient-to-r from-orange-600 to-orange-700 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Catalog Size</p>
              <p className="text-3xl font-bold text-white">{metrics.catalogSize}</p>
              <div className="flex items-center mt-2">
                <Music className="w-4 h-4 text-orange-200 mr-1" />
                <span className="text-orange-200 text-sm">Total Content</span>
              </div>
            </div>
            <Music className="w-12 h-12 text-orange-200" />
          </div>
        </motion.div>
      </div>

      {/* Next Payout Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-r from-indigo-600 to-indigo-700 p-6 rounded-xl shadow-lg"
      >
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-white mb-2">Next Payout</h3>
            <p className="text-indigo-100 mb-4">
              {formatDYO(metrics.payoutAmount)} will be sent to your wallet
            </p>
            <div className="flex items-center text-indigo-200">
              <Clock className="w-5 h-5 mr-2" />
              <span>In {Math.ceil((metrics.nextPayout.getTime() - Date.now()) / (1000 * 60 * 60 * 24))} days</span>
            </div>
          </div>
          <div className="text-right">
            <Calendar className="w-16 h-16 text-indigo-200 mb-2" />
            <p className="text-indigo-100 text-sm">
              {metrics.nextPayout.toLocaleDateString()}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Quick DEX Card - Convert Earnings */}
      <div data-tour="dex">
        <QuickDexCard 
          currentBalance={metrics.totalEarnings}
          onSwapSuccess={fetchArtistMetrics}
        />
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Songs */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="bg-gray-800 p-6 rounded-xl shadow-lg"
        >
          <h3 className="text-xl font-bold text-white mb-4">Top Performing Songs</h3>
          <div className="space-y-4">
            {metrics.topSongs.length > 0 ? metrics.topSongs.map((song, index) => (
              <div key={song.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-white font-medium">{song.title}</p>
                    <p className="text-gray-400 text-sm">{formatNumber(song.streams)} streams</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-green-400 font-semibold">{formatDYO(song.earnings)}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-12">
                <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No tracks yet</p>
                <p className="text-gray-500 text-sm mt-2">Start uploading music to see your top performing songs!</p>
              </div>
            )}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.7 }}
          className="bg-gray-800 p-6 rounded-xl shadow-lg"
        >
          <h3 className="text-xl font-bold text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {metrics.recentActivity.length > 0 ? metrics.recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-center space-x-3 p-3 bg-gray-700 rounded-lg">
                {getActivityIcon(activity.type)}
                <div className="flex-1">
                  <p className="text-white text-sm">{activity.description}</p>
                  <p className="text-gray-400 text-xs">
                    {activity.timestamp.toLocaleTimeString()}
                  </p>
                </div>
                {activity.amount && (
                  <p className="text-green-400 font-semibold text-sm">
                    +{formatDYO(activity.amount)}
                  </p>
                )}
              </div>
            )) : (
              <div className="text-center py-12">
                <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                <p className="text-gray-400 text-lg">No activity yet</p>
                <p className="text-gray-500 text-sm mt-2">Activity will appear here as you start earning royalties!</p>
              </div>
            )}
          </div>
        </motion.div>
      </div>

      {/* Top Locations */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gray-800 p-6 rounded-xl shadow-lg"
      >
        <h3 className="text-xl font-bold text-white mb-4">Top Fan Locations</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {metrics.topLocations.length > 0 ? metrics.topLocations.map((location, index) => (
            <div key={index} className="bg-gray-700 p-4 rounded-lg text-center">
              <MapPin className="w-8 h-8 text-blue-400 mx-auto mb-2" />
              <p className="text-white font-semibold">{location.city}</p>
              <p className="text-gray-400 text-sm">{location.country}</p>
              <p className="text-blue-400 font-bold mt-2">{formatNumber(location.streams)}</p>
              <p className="text-gray-500 text-xs">{location.percentage}% of total</p>
            </div>
          )) : (
            <div className="col-span-5 text-center py-12">
              <MapPin className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No location data yet</p>
              <p className="text-gray-500 text-sm mt-2">Location data will appear as you get listeners from different countries!</p>
            </div>
          )}
        </div>
      </motion.div>

      {/* Goal Modal */}
      <AnimatePresence>
        {showGoalModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowGoalModal(false)}
          >
            <motion.div
              className="bg-gray-800 rounded-xl p-8 max-w-md w-full border border-amber-400/30"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-2xl font-bold text-white mb-4">Add Earning Goal</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Goal Label</label>
                  <input
                    type="text"
                    value={newGoalLabel}
                    onChange={(e) => setNewGoalLabel(e.target.value)}
                    placeholder="e.g., Monthly Goal"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-300 mb-2">Target Amount ($DYO)</label>
                  <input
                    type="number"
                    value={newGoalTarget}
                    onChange={(e) => setNewGoalTarget(e.target.value)}
                    placeholder="1000"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div className="flex gap-4">
                  <button
                    onClick={addEarningGoal}
                    className="flex-1 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all"
                  >
                    Add Goal
                  </button>
                  <button
                    onClick={() => setShowGoalModal(false)}
                    className="flex-1 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ArtistDashboard;
