import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Users, 
  Play, 
  Download,
  Eye,
  Music,
  Video,
  Gamepad2,
  Calendar,
  Filter,
  Download as DownloadIcon
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getApiBaseUrl } from '../../utils/apiConfig';

interface PlatformMetrics {
  platform: 'music' | 'video' | 'gaming';
  name: string;
  icon: React.ComponentType<any>;
  color: string;
  totalContent: number;
  totalViews: number;
  totalDownloads: number;
  totalEarnings: number;
  monthlyGrowth: number;
  topContent: Array<{
    id: string;
    title: string;
    views: number;
    earnings: number;
  }>;
}

interface TimeRange {
  label: string;
  value: string;
  days: number;
}

const CrossPlatformAnalytics: React.FC = () => {
  const { user } = useAuth();
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>({
    label: 'Last 30 days',
    value: '30d',
    days: 30
  });

  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetrics[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.uid) {
      fetchAnalytics();
    }
  }, [user?.uid, selectedTimeRange]);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get wallet address from multiple sources
      let walletAddress = user?.uid;
      
      if (!walletAddress || !walletAddress.startsWith('DU')) {
        walletAddress = localStorage.getItem('dujyo_wallet_account');
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
        console.warn('❌ [CROSS-PLATFORM] No valid native blockchain address available (must start with "DU")');
        setLoading(false);
        return;
      }

      // Fetch analytics data from backend
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/analytics/artist/${walletAddress}`, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data');
      }

      const analyticsData = await response.json();

      // Transform backend data to platform metrics
      // For now, show only music platform data (backend doesn't separate by platform yet)
      // TODO: When backend supports platform-specific analytics, update this
      const metrics: PlatformMetrics[] = [
        {
          platform: 'music',
          name: 'Music',
          icon: Music,
          color: '#F59E0B',
          totalContent: analyticsData.total_tracks || 0,
          totalViews: analyticsData.total_streams || 0,
          totalDownloads: 0, // Backend doesn't provide downloads yet
          totalEarnings: analyticsData.total_revenue || 0,
          monthlyGrowth: 0, // Backend doesn't provide growth yet
          topContent: (analyticsData.top_tracks || []).slice(0, 3).map((track: any) => ({
            id: track.track_id || '',
            title: track.track_name || 'Unknown',
            views: track.streams || 0,
            earnings: track.revenue || 0
          }))
        },
        {
          platform: 'video',
          name: 'Video',
          icon: Video,
          color: '#00F5FF',
          totalContent: 0, // Backend doesn't support video yet
          totalViews: 0,
          totalDownloads: 0,
          totalEarnings: 0.0,
          monthlyGrowth: 0,
          topContent: []
        },
        {
          platform: 'gaming',
          name: 'Gaming',
          icon: Gamepad2,
          color: '#EA580C',
          totalContent: 0, // Backend doesn't support gaming yet
          totalViews: 0,
          totalDownloads: 0,
          totalEarnings: 0.0,
          monthlyGrowth: 0,
          topContent: []
        }
      ];

      setPlatformMetrics(metrics);
    } catch (error) {
      console.error('Error fetching analytics data:', error);
      // Set empty metrics on error
      setPlatformMetrics([
        {
          platform: 'music',
          name: 'Music',
          icon: Music,
          color: '#F59E0B',
          totalContent: 0,
          totalViews: 0,
          totalDownloads: 0,
          totalEarnings: 0.0,
          monthlyGrowth: 0,
          topContent: []
        },
        {
          platform: 'video',
          name: 'Video',
          icon: Video,
          color: '#00F5FF',
          totalContent: 0,
          totalViews: 0,
          totalDownloads: 0,
          totalEarnings: 0.0,
          monthlyGrowth: 0,
          topContent: []
        },
        {
          platform: 'gaming',
          name: 'Gaming',
          icon: Gamepad2,
          color: '#EA580C',
          totalContent: 0,
          totalViews: 0,
          totalDownloads: 0,
          totalEarnings: 0.0,
          monthlyGrowth: 0,
          topContent: []
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const timeRanges: TimeRange[] = [
    { label: 'Last 7 days', value: '7d', days: 7 },
    { label: 'Last 30 days', value: '30d', days: 30 },
    { label: 'Last 90 days', value: '90d', days: 90 },
    { label: 'Last year', value: '1y', days: 365 }
  ];

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const getTotalMetrics = () => {
    return platformMetrics.reduce((totals, platform) => ({
      totalContent: totals.totalContent + platform.totalContent,
      totalViews: totals.totalViews + platform.totalViews,
      totalDownloads: totals.totalDownloads + platform.totalDownloads,
      totalEarnings: totals.totalEarnings + platform.totalEarnings
    }), {
      totalContent: 0,
      totalViews: 0,
      totalDownloads: 0,
      totalEarnings: 0
    });
  };

  const filteredPlatforms = selectedPlatform === 'all' 
    ? platformMetrics 
    : platformMetrics.filter(p => p.platform === selectedPlatform);

  const totalMetrics = getTotalMetrics();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Cross-Platform Analytics</h2>
          <p className="text-gray-400">Unified insights across all your content platforms</p>
        </div>
        <div className="flex items-center gap-3">
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors">
            <DownloadIcon size={16} />
            Export Data
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Filter size={16} className="text-gray-400" />
          <select
            value={selectedTimeRange.value}
            onChange={(e) => {
              const range = timeRanges.find(r => r.value === e.target.value);
              if (range) setSelectedTimeRange(range);
            }}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          >
            {timeRanges.map(range => (
              <option key={range.value} value={range.value}>
                {range.label}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedPlatform}
            onChange={(e) => setSelectedPlatform(e.target.value)}
            className="bg-gray-700 text-white px-3 py-2 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
          >
            <option value="all">All Platforms</option>
            <option value="music">Music</option>
            <option value="video">Video</option>
            <option value="gaming">Gaming</option>
          </select>
        </div>
      </div>

      {/* Total Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm font-medium">Total Content</p>
              <p className="text-3xl font-bold text-white">{totalMetrics.totalContent}</p>
              <p className="text-purple-200 text-sm">Across all platforms</p>
            </div>
            <BarChart3 className="w-12 h-12 text-purple-200" />
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
              <p className="text-blue-100 text-sm font-medium">Total Views</p>
              <p className="text-3xl font-bold text-white">{formatNumber(totalMetrics.totalViews)}</p>
              <p className="text-blue-200 text-sm">All-time views</p>
            </div>
            <Eye className="w-12 h-12 text-blue-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Downloads</p>
              <p className="text-3xl font-bold text-white">{formatNumber(totalMetrics.totalDownloads)}</p>
              <p className="text-green-200 text-sm">Content downloads</p>
            </div>
            <Download className="w-12 h-12 text-green-200" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-gradient-to-r from-yellow-600 to-yellow-700 p-6 rounded-xl shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Total Earnings</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(totalMetrics.totalEarnings)}</p>
              <p className="text-yellow-200 text-sm">Cross-platform revenue</p>
            </div>
            <DollarSign className="w-12 h-12 text-yellow-200" />
          </div>
        </motion.div>
      </div>

      {/* Platform Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {filteredPlatforms.map((platform, index) => {
          const Icon = platform.icon;
          return (
            <motion.div
              key={platform.platform}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 + index * 0.1 }}
              className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div 
                    className="p-3 rounded-lg"
                    style={{ backgroundColor: `${platform.color}20` }}
                  >
                    <Icon size={24} style={{ color: platform.color }} />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{platform.name}</h3>
                    <p className="text-gray-400 text-sm">Platform metrics</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {platform.monthlyGrowth > 0 ? (
                    <TrendingUp size={16} className="text-green-400" />
                  ) : (
                    <TrendingDown size={16} className="text-red-400" />
                  )}
                  <span className={`text-sm font-medium ${
                    platform.monthlyGrowth > 0 ? 'text-green-400' : 'text-red-400'
                  }`}>
                    {platform.monthlyGrowth > 0 ? '+' : ''}{platform.monthlyGrowth}%
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Content</span>
                  <span className="text-white font-semibold">{platform.totalContent}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Views</span>
                  <span className="text-white font-semibold">{formatNumber(platform.totalViews)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Downloads</span>
                  <span className="text-white font-semibold">{formatNumber(platform.totalDownloads)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Earnings</span>
                  <span className="text-white font-semibold">{formatCurrency(platform.totalEarnings)}</span>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-700/50">
                <h4 className="text-sm font-medium text-gray-400 mb-3">Top Content</h4>
                <div className="space-y-2">
                  {platform.topContent.map((content, contentIndex) => (
                    <div key={content.id} className="flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <p className="text-white truncate">{content.title}</p>
                        <p className="text-gray-400">{formatNumber(content.views)} views</p>
                      </div>
                      <span className="text-green-400 font-semibold">
                        {formatCurrency(content.earnings)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Earnings Distribution Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="bg-gray-800/50 rounded-xl border border-gray-700/50 p-6"
      >
        <h3 className="text-xl font-semibold text-white mb-6">Earnings Distribution</h3>
        <div className="space-y-4">
          {platformMetrics.map((platform, index) => {
            const percentage = (platform.totalEarnings / totalMetrics.totalEarnings) * 100;
            return (
              <div key={platform.platform} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded"
                      style={{ backgroundColor: platform.color }}
                    />
                    <span className="text-white font-medium">{platform.name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-white font-semibold">{formatCurrency(platform.totalEarnings)}</span>
                    <span className="text-gray-400 text-sm ml-2">({percentage.toFixed(1)}%)</span>
                  </div>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="h-2 rounded-full transition-all duration-1000"
                    style={{ 
                      width: `${percentage}%`,
                      backgroundColor: platform.color
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
};

export default CrossPlatformAnalytics;
