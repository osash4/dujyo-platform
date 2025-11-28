import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import SimpleAppLayout from '../components/Layout/SimpleAppLayout';
import AnimatedCarousel from '../components/common/AnimatedCarousel';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useAuth } from '../auth/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { getApiBaseUrl } from '../utils/apiConfig';
import Logo from '../components/common/Logo';
import Breadcrumbs from '../components/common/Breadcrumbs';
import AdvancedFilters, { FilterOption } from '../components/common/AdvancedFilters';
import TrendingSection from '../components/common/TrendingSection';
import KeyboardShortcuts from '../components/common/KeyboardShortcuts';
import { Coins, TrendingUp, Users, Wallet, Info, Trophy, Sparkles, Play, Eye, Clock, ThumbsUp, MessageCircle, Share2, Upload, Award, Zap, CheckCircle } from 'lucide-react';

// Enhanced video content with earnings data
const videoCarouselItems = [
  {
    id: '1',
    title: 'Cyberpunk Chronicles',
    description: 'A deep dive into the neon-lit world of cyberpunk culture',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop',
    type: 'video' as const,
    url: 'https://example.com/cyberpunk-chronicles.mp4',
    duration: '25:30',
    rating: 4.8,
    views: 125000,
    earnings: 2500,
    watchCompletion: 78,
    earnPerView: 0.02
  },
  {
    id: '2',
    title: 'Digital Art Masterclass',
    description: 'Learn to create stunning digital art with AI tools',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=800&h=400&fit=crop',
    type: 'video' as const,
    url: 'https://example.com/digital-art-masterclass.mp4',
    duration: '45:15',
    rating: 4.9,
    views: 89000,
    earnings: 1780,
    watchCompletion: 82,
    earnPerView: 0.02
  },
  {
    id: '3',
    title: 'Virtual Reality Experience',
    description: 'Explore immersive VR worlds and experiences',
    image: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc696?w=800&h=400&fit=crop',
    type: 'video' as const,
    url: 'https://example.com/vr-experience.mp4',
    duration: '18:45',
    rating: 4.7,
    views: 156000,
    earnings: 3120,
    watchCompletion: 75,
    earnPerView: 0.02
  }
];

const videoContent = [
  {
    id: '1',
    title: 'Cyberpunk Chronicles',
    description: 'A deep dive into the neon-lit world of cyberpunk culture',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
    duration: '25:30',
    views: 125000,
    likes: 8200,
    comments: 450,
    shares: 320,
    category: 'Documentary',
    rating: 4.8,
    earnings: 2500,
    watchCompletion: 78,
    earnPerView: 0.02,
    creator: 'CyberVision',
    engagementMultiplier: 1.5
  },
  {
    id: '2',
    title: 'Digital Art Masterclass',
    description: 'Learn to create stunning digital art with AI tools',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
    duration: '45:15',
    views: 89000,
    likes: 6500,
    comments: 380,
    shares: 250,
    category: 'Tutorial',
    rating: 4.9,
    earnings: 1780,
    watchCompletion: 82,
    earnPerView: 0.02,
    creator: 'ArtMaster',
    engagementMultiplier: 1.8
  },
  {
    id: '3',
    title: 'Virtual Reality Experience',
    description: 'Explore immersive VR worlds and experiences',
    image: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc696?w=400&h=300&fit=crop',
    duration: '18:45',
    views: 156000,
    likes: 12300,
    comments: 680,
    shares: 520,
    category: 'Experience',
    rating: 4.7,
    earnings: 3120,
    watchCompletion: 75,
    earnPerView: 0.02,
    creator: 'VRExplorer',
    engagementMultiplier: 1.6
  },
  {
    id: '4',
    title: 'Neon City Walkthrough',
    description: 'Take a virtual tour through a cyberpunk metropolis',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
    duration: '32:20',
    views: 203000,
    likes: 15700,
    comments: 920,
    shares: 680,
    category: 'Tour',
    rating: 4.9,
    earnings: 4060,
    watchCompletion: 85,
    earnPerView: 0.02,
    creator: 'CityWalker',
    engagementMultiplier: 2.0
  },
  {
    id: '5',
    title: 'AI Music Generation',
    description: 'Watch AI create original music in real-time',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
    duration: '22:10',
    views: 78000,
    likes: 5900,
    comments: 320,
    shares: 210,
    category: 'Music',
    rating: 4.6,
    earnings: 1560,
    watchCompletion: 70,
    earnPerView: 0.02,
    creator: 'AIMusic',
    engagementMultiplier: 1.4
  },
  {
    id: '6',
    title: 'Holographic Interface Demo',
    description: 'Experience the future of human-computer interaction',
    image: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=300&fit=crop',
    duration: '28:35',
    views: 134000,
    likes: 9800,
    comments: 560,
    shares: 410,
    category: 'Technology',
    rating: 4.8,
    earnings: 2680,
    watchCompletion: 80,
    earnPerView: 0.02,
    creator: 'TechFuture',
    engagementMultiplier: 1.7
  }
];

// Top Earning Videos Leaderboard
const topEarningVideos = [
  { rank: 1, title: 'Neon City Walkthrough', creator: 'CityWalker', earnings: 4060, views: 203000, watchTime: 6500, payout: 3248 },
  { rank: 2, title: 'Virtual Reality Experience', creator: 'VRExplorer', earnings: 3120, views: 156000, watchTime: 4800, payout: 2496 },
  { rank: 3, title: 'Cyberpunk Chronicles', creator: 'CyberVision', earnings: 2500, views: 125000, watchTime: 3900, payout: 2000 },
  { rank: 4, title: 'Holographic Interface Demo', creator: 'TechFuture', earnings: 2680, views: 134000, watchTime: 4200, payout: 2144 },
  { rank: 5, title: 'Digital Art Masterclass', creator: 'ArtMaster', earnings: 1780, views: 89000, watchTime: 3600, payout: 1424 }
];

// Monetization Tiers
const monetizationTiers = [
  { tier: 'Bronze', minViews: 10000, earningsMultiplier: 1.0, color: 'from-orange-500 to-orange-600', icon: Award },
  { tier: 'Silver', minViews: 50000, earningsMultiplier: 1.5, color: 'from-gray-400 to-gray-500', icon: Trophy },
  { tier: 'Gold', minViews: 100000, earningsMultiplier: 2.0, color: 'from-yellow-400 to-yellow-500', icon: Sparkles }
];

interface VideoMetrics {
  dyoPerView: number;
  totalViews: number;
  avgWatchCompletion: number;
}

interface WatchTimeMilestone {
  time: number;
  label: string;
  reward: number;
  completed: boolean;
}

const VideoPage: React.FC = () => {
  // Access PlayerContext directly like MusicPage and GamingPage do
  const { playTrack, setPlayerPosition } = usePlayerContext();
  const { user } = useAuth();
  const { connect, account, isConnecting } = useWallet();
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [filteredContent, setFilteredContent] = useState(videoContent);
  const [metrics, setMetrics] = useState<VideoMetrics>({
    dyoPerView: 0.02,
    totalViews: 0,
    avgWatchCompletion: 0
  });
  const [creatorEarnings, setCreatorEarnings] = useState<number>(0);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [currentWatchTime, setCurrentWatchTime] = useState(0); // in minutes
  const [watchTimeMilestones, setWatchTimeMilestones] = useState<WatchTimeMilestone[]>([
    { time: 30, label: '30 min', reward: 5, completed: false },
    { time: 60, label: '1 hour', reward: 12, completed: false },
    { time: 120, label: '2 hours', reward: 30, completed: false }
  ]);
  const [userTier, setUserTier] = useState<'Bronze' | 'Silver' | 'Gold'>('Bronze');
  const [engagementPoints, setEngagementPoints] = useState(0);
  
  // Calculate total metrics
  useEffect(() => {
    const totalViews = videoContent.reduce((sum, video) => sum + video.views, 0);
    const avgCompletion = videoContent.reduce((sum, video) => sum + video.watchCompletion, 0) / videoContent.length;
    setMetrics({
      dyoPerView: 0.02,
      totalViews,
      avgWatchCompletion: avgCompletion
    });
  }, []);

  // Fetch creator earnings function - defined before useEffect to avoid dependency issues
  const fetchCreatorEarnings = useCallback(async () => {
    if (!account) return;
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('jwt_token');
      
      const response = await fetch(`${apiBaseUrl}/api/earnings/creator/${account}`, {
        headers: {
          'Authorization': token ? `Bearer ${token}` : '',
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setCreatorEarnings(data.totalEarnings || 0);
        setUserTier(data.tier || 'Bronze');
        setEngagementPoints(data.engagementPoints || 0);
      }
      // Silently fail if endpoint doesn't exist yet
    } catch (error) {
      // Silently fail - this endpoint might not be implemented yet
      console.warn('Error fetching creator earnings (non-critical):', error);
    }
  }, [account]);

  // Fetch creator earnings if wallet connected
  useEffect(() => {
    if (account && user) {
      fetchCreatorEarnings();
    }
  }, [account, user, fetchCreatorEarnings]);

  // Test backend connection on mount for debugging
  useEffect(() => {
    console.error('🎬 VideoPage: Testing backend connection...');
    import('../utils/testBackend').then(({ testBackendConnection }) => {
      testBackendConnection().then(result => {
        if (result.success) {
          console.error('✅ VideoPage: Backend is accessible');
        } else {
          console.error('❌ VideoPage: Backend connection failed:', result.error);
        }
      });
    }).catch(err => {
      console.error('❌ VideoPage: Failed to load test utility:', err);
    });
  }, []);

  // Update watch time milestones
  useEffect(() => {
    setWatchTimeMilestones(prev => prev.map(milestone => ({
      ...milestone,
      completed: currentWatchTime >= milestone.time
    })));
  }, [currentWatchTime]);

  // Format number helper (moved before useMemo to avoid initialization issues)
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  // Trending data with earnings - use useMemo to avoid initialization issues
  const trendingVideos = useMemo(() => {
    return videoContent.slice(0, 4).map(v => ({
      id: v.id,
      title: v.title,
      subtitle: v.category,
      image: v.image,
      type: 'video' as const,
      views: formatNumber(v.views),
      likes: formatNumber(v.likes),
      trend: v.rating >= 4.8 ? 'up' as const : 'new' as const,
      earnings: v.earnings
    }));
  }, []);
  
  // Filter options
  const filterOptions: FilterOption[] = [
    {
      id: 'category',
      label: 'Category',
      type: 'checkbox',
      options: [
        { value: 'documentary', label: 'Documentary' },
        { value: 'tutorial', label: 'Tutorial' },
        { value: 'experience', label: 'Experience' },
        { value: 'music', label: 'Music' }
      ]
    },
    {
      id: 'rating',
      label: 'Minimum Rating',
      type: 'range',
      min: 0,
      max: 5
    },
    {
      id: 'search',
      label: 'Search',
      type: 'search'
    }
  ];
  
  const handleFilterChange = (filters: Record<string, any>) => {
    let filtered = [...videoContent];
    
    if (filters.category && filters.category.length > 0) {
      filtered = filtered.filter(video => 
        filters.category.includes(video.category.toLowerCase())
      );
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(video =>
        video.title.toLowerCase().includes(searchLower) ||
        video.description?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.rating) {
      const minRating = filters.rating.max / 5;
      filtered = filtered.filter(video => video.rating >= minRating);
    }
    
    setFilteredContent(filtered);
  };
  
  // Keyboard shortcuts
  const shortcuts = [
    { key: 'space', description: 'Play/Pause', action: () => {}, category: 'Playback' },
    { key: 'ctrl+k', description: 'Search', action: () => {}, category: 'Navigation' }
  ];

  // Set player position to top when component mounts
  useEffect(() => {
    if (setPlayerPosition) {
      try {
        setPlayerPosition('top');
      } catch (error) {
        console.warn('Error setting player position:', error);
      }
    }
  }, [setPlayerPosition]);

  const handlePlayVideo = (item: any) => {
    playTrack({
      id: item.id,
      title: item.title,
      url: item.url || `https://example.com/video/${item.id}`,
      playerMode: 'video',
      cover: item.image
    });
    
    // Simulate watch time increment (in real app, this would track actual playback)
    setCurrentWatchTime(prev => prev + 1);
  };

  const handleVideoClick = (video: any) => {
    setSelectedVideo(video.id);
    handlePlayVideo(video);
  };

  const handleViewCreatorEarnings = async () => {
    if (!account) {
      await connect();
    } else {
      setShowEarningsModal(true);
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
  };

  const formatTime = (minutes: number): string => {
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getTierProgress = () => {
    const currentTier = monetizationTiers.find(t => t.tier === userTier);
    const nextTier = monetizationTiers[monetizationTiers.findIndex(t => t.tier === userTier) + 1];
    if (!nextTier) return 100;
    // This would be calculated from actual views
    const currentViews = 25000; // Mock data
    const progress = (currentViews / nextTier.minViews) * 100;
    return Math.min(progress, 100);
  };

  return (
    <SimpleAppLayout>
      <KeyboardShortcuts shortcuts={shortcuts} />
      <div className="min-h-screen text-white" style={{ backgroundColor: 'var(--bg-hero)' }}>
        {/* Breadcrumbs */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
          <Breadcrumbs />
        </div>
        
        {/* Hero Section with Carousel */}
        <section className="relative py-8 px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-7xl mx-auto"
          >
            <div className="text-center mb-8">
              {/* Logo Integration */}
              <motion.div
                className="mb-6 flex justify-center"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <Logo size="lg" showText={false} variant="icon" />
              </motion.div>

              <h1 className="text-4xl md:text-6xl font-bold neon-text-video mb-4">
                Video Galaxy
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-2">
                Immerse yourself in visual storytelling. 
                Watch documentaries, tutorials, and experiences from the digital frontier.
              </p>
              <p className="text-sm text-cyan-400/80 font-semibold mb-6">
                Powered by DUJYO • Stream-to-Earn
              </p>

              {/* Video Stream-to-Earn Hero Metrics */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <motion.div
                  className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 rounded-xl p-4 backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Coins className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs text-gray-400">$DYO per View</span>
                  </div>
                  <motion.div
                    className="text-3xl font-bold text-cyan-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                  >
                    {metrics.dyoPerView.toFixed(2)} $DYO
                  </motion.div>
                  <p className="text-xs text-gray-400 mt-1">Earn while you watch</p>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 rounded-xl p-4 backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Eye className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs text-gray-400">Total Views</span>
                  </div>
                  <motion.div
                    className="text-3xl font-bold text-cyan-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                  >
                    {formatNumber(metrics.totalViews)}
                  </motion.div>
                  <p className="text-xs text-gray-400 mt-1">And growing...</p>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 rounded-xl p-4 backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    <span className="text-xs text-gray-400">Avg Completion</span>
                  </div>
                  <motion.div
                    className="text-3xl font-bold text-cyan-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.4 }}
                  >
                    {metrics.avgWatchCompletion.toFixed(0)}%
                  </motion.div>
                  <p className="text-xs text-gray-400 mt-1">Watch rate</p>
                </motion.div>
              </motion.div>

              {/* View Creator Earnings Button */}
              {account && user && (
                <motion.button
                  onClick={handleViewCreatorEarnings}
                  className="mb-6 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300 shadow-lg hover:shadow-cyan-500/25 flex items-center gap-2 mx-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Wallet className="w-5 h-5" />
                  <span>View Creator Earnings: {creatorEarnings.toFixed(2)} $DYO</span>
                </motion.button>
              )}

              {/* Watch-Time Rewards System */}
              <motion.div
                className="max-w-2xl mx-auto mb-8 p-4 bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-400/30 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between flex-wrap gap-4 mb-4">
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-sm font-semibold text-cyan-300">Watch-Time Rewards</p>
                      <p className="text-xs text-gray-400">Current session: {formatTime(currentWatchTime)}</p>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {watchTimeMilestones.map((milestone, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border ${
                        milestone.completed
                          ? 'bg-cyan-500/20 border-cyan-400/50'
                          : 'bg-gray-700/50 border-gray-600'
                      }`}
                    >
                      <div className="text-xs text-gray-400 mb-1">{milestone.label}</div>
                      <div className={`text-lg font-bold ${milestone.completed ? 'text-cyan-400' : 'text-gray-500'}`}>
                        {milestone.reward} $DYO
                      </div>
                      {milestone.completed && (
                        <CheckCircle className="w-4 h-4 text-cyan-400 mt-1" />
                      )}
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Featured Videos Carousel */}
            <div className="mb-12">
              <AnimatedCarousel
                items={videoCarouselItems}
                section="video"
                onPlay={handlePlayVideo}
                autoPlay={true}
                autoPlayInterval={8000}
              />
            </div>
          </motion.div>
        </section>

        {/* Top Earning Videos Leaderboard */}
        <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-3xl font-bold text-white">Top Earning Videos</h2>
                </div>
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowTooltip('videos')}
                    onMouseLeave={() => setShowTooltip(null)}
                    className="text-gray-400 hover:text-cyan-400 transition-colors"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                  {showTooltip === 'videos' && (
                    <div className="absolute right-0 top-8 w-64 p-3 bg-gray-800 border border-cyan-400/30 rounded-lg text-xs text-gray-300 z-10">
                      Top videos ranked by total $DYO earnings. Rankings update based on views, watch time, and engagement.
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {topEarningVideos.map((video, index) => (
                  <motion.div
                    key={video.rank}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`bg-gray-800/50 border rounded-lg p-4 backdrop-blur-sm ${
                      video.rank === 1 ? 'border-cyan-400 border-2' : 'border-gray-600'
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        video.rank === 1 ? 'bg-cyan-500 text-white' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {video.rank}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-white text-sm truncate">{video.title}</h3>
                        <p className="text-xs text-gray-400 truncate">{video.creator}</p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1 text-cyan-400">
                        <Coins className="w-3 h-3" />
                        <span>{video.earnings.toFixed(2)} $DYO</span>
                      </div>
                      <div className="text-gray-400">
                        {formatNumber(video.views)} views
                      </div>
                      <div className="text-gray-500">
                        Payout: {video.payout.toFixed(2)} $DYO
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Creator Monetization Tiers */}
        {user && (
          <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                    <Award className="w-6 h-6 text-cyan-400" />
                    Creator Monetization Tiers
                  </h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  {monetizationTiers.map((tier, idx) => {
                    const isCurrentTier = tier.tier === userTier;
                    const TierIcon = tier.icon;
                    return (
                      <motion.div
                        key={tier.tier}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: idx * 0.1 }}
                        className={`bg-gray-800/50 border rounded-lg p-6 backdrop-blur-sm ${
                          isCurrentTier ? 'border-cyan-400 border-2' : 'border-gray-600'
                        }`}
                        whileHover={{ scale: 1.02 }}
                      >
                        <div className="flex items-center gap-3 mb-4">
                          <div className={`p-3 rounded-lg bg-gradient-to-r ${tier.color}`}>
                            <TierIcon className="w-6 h-6 text-white" />
                          </div>
                          <div>
                            <h3 className="text-xl font-bold text-white">{tier.tier}</h3>
                            <p className="text-xs text-gray-400">{tier.earningsMultiplier}x earnings</p>
                          </div>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Min Views:</span>
                            <span className="text-white">{formatNumber(tier.minViews)}</span>
                          </div>
                          {isCurrentTier && (
                            <div className="mt-3">
                              <div className="flex justify-between text-xs text-gray-400 mb-1">
                                <span>Progress to next tier</span>
                                <span>{getTierProgress().toFixed(0)}%</span>
                              </div>
                              <div className="w-full bg-gray-700 rounded-full h-2">
                                <motion.div
                                  className="h-2 rounded-full bg-gradient-to-r from-cyan-500 to-blue-600"
                                  initial={{ width: 0 }}
                                  animate={{ width: `${getTierProgress()}%` }}
                                  transition={{ duration: 0.5 }}
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Video Upload Incentives */}
        {!user && (
          <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
            <div className="max-w-7xl mx-auto">
              <motion.div
                className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-400/30 rounded-xl p-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <div className="flex items-center gap-4">
                  <div className="p-4 bg-cyan-500/20 rounded-lg">
                    <Upload className="w-8 h-8 text-cyan-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl font-bold text-white mb-2">Start Earning as Creator</h3>
                    <p className="text-gray-300 mb-4">
                      Upload your first video and earn bonus $DYO tokens. New creators get special promotion rewards!
                    </p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Zap className="w-4 h-4" />
                        <span>First video bonus: 50 $DYO</span>
                      </div>
                      <div className="flex items-center gap-2 text-cyan-400">
                        <Sparkles className="w-4 h-4" />
                        <span>Promotion boost for new creators</span>
                      </div>
                    </div>
                    <button
                      onClick={() => window.location.href = '/upload'}
                      className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-semibold rounded-lg hover:from-cyan-400 hover:to-blue-500 transition-all duration-300"
                    >
                      Upload Your First Video
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          </section>
        )}

        {/* Trending Section */}
        <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-7xl mx-auto">
            <TrendingSection
              items={trendingVideos}
              onItemClick={(item) => {
                const video = videoContent.find(v => v.id === item.id);
                if (video) handleVideoClick(video);
              }}
            />
          </div>
        </section>

        {/* Video Grid with Earnings */}
        <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold neon-text-video">
                  Featured Videos
                </h2>
                <AdvancedFilters
                  filters={filterOptions}
                  onFilterChange={handleFilterChange}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredContent.map((video, index) => (
                  <motion.div
                    key={video.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`bg-gray-800 bg-opacity-50 rounded-lg overflow-hidden border border-gray-600 hover:border-cyan-400 transition-all duration-300 cursor-pointer hover-glow-video relative ${
                      selectedVideo === video.id ? 'ring-2 ring-cyan-400 bg-cyan-900 bg-opacity-20' : ''
                    }`}
                    onClick={() => handleVideoClick(video)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Earn $DYO Badge */}
                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 rounded-full">
                      <Coins className="w-3 h-3 text-cyan-400" />
                      <span className="text-xs font-semibold text-cyan-300">Earn {video.earnPerView.toFixed(2)} $DYO</span>
                    </div>

                    {/* Video Thumbnail */}
                    <div className="relative">
                      <img 
                        src={video.image} 
                        alt={video.title} 
                        className="w-full h-48 object-cover"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-20" />
                      
                      {/* Duration Badge */}
                      <div className="absolute bottom-2 right-2 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                        {video.duration}
                      </div>
                      
                      {/* Play Button Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity duration-300">
                        <div className="bg-black bg-opacity-50 rounded-full p-4">
                          <Play className="w-8 h-8 text-white" />
                        </div>
                      </div>
                    </div>
                    
                    {/* Video Info */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                        {video.title}
                      </h3>
                      <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                        {video.description}
                      </p>
                      
                      <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
                        <div className="flex items-center space-x-3">
                          <span>{formatNumber(video.views)} views</span>
                          <span>{formatNumber(video.likes)} likes</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <span className="text-yellow-400">⭐</span>
                          <span>{video.rating}</span>
                        </div>
                      </div>
                      
                      {/* Earnings Info */}
                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <div className="flex items-center justify-between text-xs mb-2">
                          <div className="flex items-center gap-1 text-cyan-400">
                            <TrendingUp className="w-3 h-3" />
                            <span>Creator: {video.earnings.toFixed(2)} $DYO</span>
                          </div>
                          <div className="flex items-center gap-1 text-gray-400">
                            <Clock className="w-3 h-3" />
                            <span>{video.watchCompletion}% completion</span>
                          </div>
                        </div>
                        
                        {/* Engagement Rewards */}
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <div className="flex items-center gap-1">
                            <ThumbsUp className="w-3 h-3 text-cyan-400" />
                            <span>+{video.likes * 0.001} $DYO</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <MessageCircle className="w-3 h-3 text-cyan-400" />
                            <span>+{video.comments * 0.01} $DYO</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Share2 className="w-3 h-3 text-cyan-400" />
                            <span>+{video.shares * 0.015} $DYO</span>
                          </div>
                        </div>
                        <div className="mt-2 text-xs text-cyan-300">
                          Engagement Multiplier: {video.engagementMultiplier}x
                        </div>
                      </div>
                      
                      <div className="mt-2">
                        <span className="text-xs bg-gray-700 text-gray-300 px-2 py-1 rounded">
                          {video.category}
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Engagement Rewards Education */}
        <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="bg-gradient-to-r from-cyan-500/10 to-blue-600/10 border border-cyan-400/30 rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-start gap-4">
                <Info className="w-6 h-6 text-cyan-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-3">Engagement Rewards System</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-300">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <ThumbsUp className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-semibold text-cyan-300">Likes</h4>
                      </div>
                      <p className="text-xs">Earn bonus $DYO for every like you give. Support creators and earn rewards!</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-semibold text-cyan-300">Comments</h4>
                      </div>
                      <p className="text-xs">Engage with creators through comments and earn additional $DYO tokens.</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Share2 className="w-4 h-4 text-cyan-400" />
                        <h4 className="font-semibold text-cyan-300">Shares</h4>
                      </div>
                      <p className="text-xs">Share videos with your network and unlock community engagement multipliers.</p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-cyan-400/20">
                    <p className="text-xs text-gray-400">
                      <strong className="text-cyan-300">Community Engagement Multiplier:</strong> The more you engage, 
                      the higher your earnings multiplier. Active community members can earn up to 2x more $DYO tokens!
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Creator Earnings Modal */}
      {showEarningsModal && account && user && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowEarningsModal(false)}
        >
          <motion.div
            className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-cyan-400/30"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Wallet className="w-6 h-6 text-cyan-400" />
                Creator Earnings
              </h3>
              <button
                onClick={() => setShowEarningsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-cyan-500/20 to-blue-600/20 border border-cyan-400/30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Total Earnings</div>
                <div className="text-3xl font-bold text-cyan-400">{creatorEarnings.toFixed(2)} $DYO</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Current Tier</div>
                  <div className="text-lg font-semibold text-white">{userTier}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Engagement Points</div>
                  <div className="text-lg font-semibold text-white">{engagementPoints}</div>
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-2">Payout History</div>
                <div className="text-sm text-gray-300">Last payout: 1,250 $DYO (7 days ago)</div>
                <div className="text-sm text-gray-300">Next payout: Estimated in 3 days</div>
              </div>
              <button
                onClick={() => setShowEarningsModal(false)}
                className="w-full py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </SimpleAppLayout>
  );
};

export default VideoPage;
