// MusicPage.tsx
import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import SimpleAppLayout from "../../../components/Layout/SimpleAppLayout";
import AnimatedCarousel from "../../../components/common/AnimatedCarousel";
import { usePlayerContext } from "../../../contexts/PlayerContext";
import { useAuth } from "../../../auth/AuthContext";
import { useWallet } from "../../../hooks/useWallet";
import { useLanguage } from "../../../contexts/LanguageContext";
import { getApiBaseUrl } from "../../../utils/apiConfig";
import Logo from "../../../components/common/Logo";
import Breadcrumbs from "../../../components/common/Breadcrumbs";
import AdvancedFilters, { FilterOption } from "../../../components/common/AdvancedFilters";
import TrendingSection from "../../../components/common/TrendingSection";
import CuratedPlaylist from "../../../components/common/CuratedPlaylist";
import KeyboardShortcuts from "../../../components/common/KeyboardShortcuts";
import { Coins, TrendingUp, Users, Wallet, Info, Trophy, Sparkles, Play, Eye } from "lucide-react";

// Enhanced music content with earnings data
const musicCarouselItems = [
  {
    id: '1',
    title: 'Dices',
    description: 'Original reggaeton track by Rian - Your authentic music',
    image: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=800&h=400&fit=crop',
    type: 'music' as const,
    url: '/music/Dices.wav',
    duration: '3:45',
    rating: 4.9,
    streams: 125000,
    earnings: 1250,
    listenersEarning: 450,
    dailyEarnings: 125
  },
  {
    id: '2',
    title: 'COMOPAMORA',
    description: 'Original reggaeton track by Rian - Your authentic music',
    image: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=800&h=400&fit=crop',
    type: 'music' as const,
    url: '/music/COMOPAMORA.wav',
    duration: '4:12',
    rating: 4.8,
    streams: 89000,
    earnings: 890,
    listenersEarning: 320,
    dailyEarnings: 89
  },
  {
    id: '3',
    title: 'Soy un principiante',
    description: 'Original track by YVML - Your authentic music',
    image: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=800&h=400&fit=crop',
    type: 'music' as const,
    url: '/music/Soy un principiante.wav',
    duration: '3:28',
    rating: 4.9,
    streams: 156000,
    earnings: 1560,
    listenersEarning: 560,
    dailyEarnings: 156
  }
];

const musicContent = [
  {
    id: '1',
    title: 'Dices',
    artist: 'Rian',
    src: '/music/Dices.wav',
    cover: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
    duration: '3:45',
    genre: 'Reggaeton',
    rating: 4.9,
    streams: 125000,
    earnings: 1250,
    listenersEarning: 450,
    dailyEarnings: 125,
    earnPerStream: 0.01
  },
  {
    id: '2',
    title: 'COMOPAMORA',
    artist: 'Rian',
    src: '/music/COMOPAMORA.wav',
    cover: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
    duration: '4:12',
    genre: 'Reggaeton',
    rating: 4.8,
    streams: 89000,
    earnings: 890,
    listenersEarning: 320,
    dailyEarnings: 89,
    earnPerStream: 0.01
  },
  {
    id: '3',
    title: 'Soy un principiante',
    artist: 'YVML',
    src: '/music/Soy un principiante.wav',
    cover: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop',
    duration: '3:28',
    genre: 'Reggaeton',
    rating: 4.9,
    streams: 156000,
    earnings: 1560,
    listenersEarning: 560,
    dailyEarnings: 156,
    earnPerStream: 0.01
  },
  {
    id: '4',
    title: 'Drum&BassRomantic',
    artist: 'Rian',
    src: '/music/Drum&BassRomantic .wav',
    cover: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop',
    duration: '4:05',
    genre: 'Drum & Bass',
    rating: 4.7,
    streams: 78000,
    earnings: 780,
    listenersEarning: 280,
    dailyEarnings: 78,
    earnPerStream: 0.01
  }
];

// Top Earners Leaderboard Data
const topEarners = [
  { rank: 1, artist: 'Rian', totalEarnings: 3120, streams: 214000, monthlyEarnings: 3120, avatar: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop' },
  { rank: 2, artist: 'YVML', totalEarnings: 1560, streams: 156000, monthlyEarnings: 1560, avatar: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=100&h=100&fit=crop' },
  { rank: 3, artist: 'DJ Cyber', totalEarnings: 1240, streams: 124000, monthlyEarnings: 1240, avatar: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=100&h=100&fit=crop' },
  { rank: 4, artist: 'Neon Beats', totalEarnings: 980, streams: 98000, monthlyEarnings: 980, avatar: 'https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=100&h=100&fit=crop' },
  { rank: 5, artist: 'Digital Waves', totalEarnings: 750, streams: 75000, monthlyEarnings: 750, avatar: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&h=100&fit=crop' }
];

interface StreamMetrics {
  dyoPerStream: number;
  totalStreams: number;
  activeListeners: number;
}

const MusicPage: React.FC = () => {
  const { t } = useLanguage();
  const { playTrack, setPlayerPosition } = usePlayerContext();
  const { user } = useAuth();
  const { connect, account, isConnecting } = useWallet();
  const [selectedSong, setSelectedSong] = useState<string | null>(null);
  const [filteredContent, setFilteredContent] = useState(musicContent);
  const [metrics, setMetrics] = useState<StreamMetrics>({
    dyoPerStream: 0.01,
    totalStreams: 0,
    activeListeners: 0
  });
  const [userEarnings, setUserEarnings] = useState<number>(0);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [showTooltip, setShowTooltip] = useState<string | null>(null);
  const [listeningStreak, setListeningStreak] = useState(0);
  const [earningsProgress, setEarningsProgress] = useState(0);
  
  // Calculate total metrics
  useEffect(() => {
    const totalStreams = musicContent.reduce((sum, song) => sum + song.streams, 0);
    const activeListeners = Math.floor(totalStreams / 100); // Estimate based on streams
    setMetrics({
      dyoPerStream: 0.01,
      totalStreams,
      activeListeners
    });
  }, []);

  // Fetch user earnings if wallet connected
  useEffect(() => {
    if (account) {
      fetchUserEarnings();
    }
  }, [account]);

  const fetchUserEarnings = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/earnings/user/${account}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserEarnings(data.totalEarnings || 0);
        setListeningStreak(data.streak || 0);
        setEarningsProgress(data.progress || 0);
      }
    } catch (error) {
      console.error('Error fetching earnings:', error);
    }
  };
  
  // Trending data with earnings
  const trendingMusic = [
    { id: '1', title: 'Dices', subtitle: 'Rian', image: musicContent[0].cover, type: 'music' as const, views: '125K', likes: '8.2K', trend: 'up' as const, earnings: 1250 },
    { id: '2', title: 'COMOPAMORA', subtitle: 'Rian', image: musicContent[1].cover, type: 'music' as const, views: '89K', likes: '6.5K', trend: 'new' as const, earnings: 890 },
    { id: '3', title: 'Soy un principiante', subtitle: 'YVML', image: musicContent[2].cover, type: 'music' as const, views: '156K', likes: '12.3K', trend: 'up' as const, earnings: 1560 },
    { id: '4', title: 'Drum&BassRomantic', subtitle: 'Rian', image: musicContent[3].cover, type: 'music' as const, views: '78K', likes: '5.9K', trend: 'new' as const, earnings: 780 }
  ];
  
  // Curated playlist
  const curatedPlaylist = {
    title: t('music.topPicks'),
    items: musicContent.map(song => ({
      id: song.id,
      title: song.title,
      artist: song.artist,
      duration: song.duration,
      cover: song.cover
    }))
  };
  
  // Filter options
  const filterOptions: FilterOption[] = [
    {
      id: 'genre',
      label: t('music.genre'),
      type: 'checkbox',
      options: [
        { value: 'reggaeton', label: t('music.reggaeton') },
        { value: 'drum-bass', label: t('music.drumBass') },
        { value: 'electronic', label: t('music.electronic') },
        { value: 'hip-hop', label: t('music.hipHop') }
      ]
    },
    {
      id: 'rating',
      label: t('music.minimumRating'),
      type: 'range',
      min: 0,
      max: 5
    },
    {
      id: 'search',
      label: t('common.search'),
      type: 'search'
    }
  ];
  
  const handleFilterChange = (filters: Record<string, any>) => {
    let filtered = [...musicContent];
    
    if (filters.genre && filters.genre.length > 0) {
      filtered = filtered.filter(song => 
        filters.genre.includes(song.genre.toLowerCase().replace(/\s+/g, '-'))
      );
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(song =>
        song.title.toLowerCase().includes(searchLower) ||
        song.artist?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.rating) {
      const minRating = filters.rating.max / 5;
      filtered = filtered.filter(song => song.rating >= minRating);
    }
    
    setFilteredContent(filtered);
  };
  
  // Keyboard shortcuts
  const shortcuts = [
    { key: 'space', description: t('common.playPause'), action: () => {}, category: t('common.playback') },
    { key: 'ctrl+k', description: t('common.search'), action: () => {}, category: t('common.navigation') },
    { key: 'ctrl+f', description: t('common.openFilters'), action: () => {}, category: t('common.navigation') }
  ];

  // Set player position to top when component mounts
  useEffect(() => {
    setPlayerPosition('top');
  }, [setPlayerPosition]);

  const handlePlayTrack = (item: any) => {
    console.log('MusicPage: handlePlayTrack called with:', item);
    const trackData = {
      id: item.id,
      title: item.title,
      url: item.url || item.src,
      playerMode: 'music' as const,
      artist: item.artist,
      cover: item.cover
    };
    console.log('MusicPage: Calling playTrack with:', trackData);
    playTrack(trackData);
    
    // Increment listening streak
    setListeningStreak(prev => prev + 1);
  };

  const handleSongClick = (song: any) => {
    setSelectedSong(song.id);
    handlePlayTrack(song);
  };

  const handleViewEarnings = async () => {
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

  return (
    <SimpleAppLayout>
      <KeyboardShortcuts shortcuts={shortcuts} />
      <div className="min-h-screen text-white" style={{ backgroundColor: 'var(--bg-primary)' }}>
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

              <h1 className="text-4xl md:text-6xl font-bold neon-text-music mb-4">
                {t('music.title')}
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-2">
                {t('music.subtitle')}
              </p>
              <p className="text-sm text-amber-400/80 font-semibold mb-6">
                {t('music.poweredBy')}
              </p>

              {/* Stream-to-Earn Hero Metrics */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <motion.div
                  className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-xl p-4 backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Coins className="w-5 h-5 text-amber-400" />
                    <span className="text-xs text-gray-400">{t('music.dyoPerStream')}</span>
                  </div>
                  <motion.div
                    className="text-3xl font-bold text-amber-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                  >
                    {metrics.dyoPerStream.toFixed(2)} $DYO
                  </motion.div>
                  <p className="text-xs text-gray-400 mt-1">{t('music.earnWhileListen')}</p>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-xl p-4 backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Play className="w-5 h-5 text-amber-400" />
                    <span className="text-xs text-gray-400">{t('music.totalStreams')}</span>
                  </div>
                  <motion.div
                    className="text-3xl font-bold text-amber-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                  >
                    {formatNumber(metrics.totalStreams)}
                  </motion.div>
                  <p className="text-xs text-gray-400 mt-1">{t('music.andCounting')}</p>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-br from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-xl p-4 backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-amber-400" />
                    <span className="text-xs text-gray-400">{t('music.activeListeners')}</span>
                  </div>
                  <motion.div
                    className="text-3xl font-bold text-amber-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.4 }}
                  >
                    {formatNumber(metrics.activeListeners)}
                  </motion.div>
                  <p className="text-xs text-gray-400 mt-1">{t('music.earningTogether')}</p>
                </motion.div>
              </motion.div>

              {/* View My Earnings Button */}
              {account && (
                <motion.button
                  onClick={handleViewEarnings}
                  className="mb-6 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all duration-300 shadow-lg hover:shadow-amber-500/25 flex items-center gap-2 mx-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Wallet className="w-5 h-5" />
                  <span>{t('music.viewMyEarnings')}: {userEarnings.toFixed(2)} $DYO</span>
                </motion.button>
              )}

              {/* Streaming Incentives */}
              <motion.div
                className="max-w-2xl mx-auto mb-8 p-4 bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-400/30 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <Sparkles className="w-5 h-5 text-amber-400" />
                    <div>
                      <p className="text-sm font-semibold text-amber-300">{t('music.listenToEarn')}</p>
                      <p className="text-xs text-gray-400">{t('music.everyStreamCounts')}</p>
                    </div>
                  </div>
                  {listeningStreak > 0 && (
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="text-xs text-amber-300">{t('music.streak')}: {listeningStreak} {t('common.days')}</span>
                    </div>
                  )}
                </div>
                {earningsProgress > 0 && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>{t('music.progressToNextMilestone')}</span>
                      <span>{earningsProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <motion.div
                        className="h-2 rounded-full bg-gradient-to-r from-amber-500 to-orange-600"
                        initial={{ width: 0 }}
                        animate={{ width: `${earningsProgress}%` }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            </div>

            {/* Featured Music Carousel */}
            <div className="mb-12">
              <AnimatedCarousel
                items={musicCarouselItems}
                section="music"
                onPlay={handlePlayTrack}
                autoPlay={true}
                autoPlayInterval={7000}
              />
            </div>
          </motion.div>
        </section>

        {/* Top Earners Leaderboard */}
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-amber-400" />
                  <h2 className="text-3xl font-bold text-white">{t('music.topEarners')}</h2>
                </div>
                <div className="relative">
                  <button
                    onMouseEnter={() => setShowTooltip('earners')}
                    onMouseLeave={() => setShowTooltip(null)}
                    className="text-gray-400 hover:text-amber-400 transition-colors"
                  >
                    <Info className="w-5 h-5" />
                  </button>
                  {showTooltip === 'earners' && (
                    <div className="absolute right-0 top-8 w-64 p-3 bg-gray-800 border border-amber-400/30 rounded-lg text-xs text-gray-300 z-10">
                      {t('music.topEarnersDescription')}
                    </div>
                  )}
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {topEarners.map((earner, index) => (
                  <motion.div
                    key={earner.rank}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`bg-gray-800/50 border rounded-lg p-4 backdrop-blur-sm ${
                      earner.rank === 1 ? 'border-amber-400 border-2' : 'border-gray-600'
                    }`}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                        earner.rank === 1 ? 'bg-amber-500 text-white' : 'bg-gray-700 text-gray-300'
                      }`}>
                        {earner.rank}
                      </div>
                      <img src={earner.avatar} alt={earner.artist} className="w-10 h-10 rounded-full object-cover" />
                    </div>
                    <h3 className="font-semibold text-white mb-1">{earner.artist}</h3>
                    <div className="space-y-1 text-xs">
                      <div className="flex items-center gap-1 text-amber-400">
                        <Coins className="w-3 h-3" />
                        <span>{earner.totalEarnings.toFixed(2)} $DYO</span>
                      </div>
                      <div className="text-gray-400">
                        {formatNumber(earner.streams)} {t('music.streams')}
                      </div>
                      <div className="text-gray-500">
                        {earner.monthlyEarnings.toFixed(2)} $DYO/{t('common.month')}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trending Section */}
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <TrendingSection
              items={trendingMusic}
              onItemClick={(item) => {
                const song = musicContent.find(s => s.id === item.id);
                if (song) handleSongClick(song);
              }}
            />
          </div>
        </section>

        {/* Curated Playlist */}
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <CuratedPlaylist
              title={curatedPlaylist.title}
              items={curatedPlaylist.items}
              onPlay={(item) => {
                const song = musicContent.find(s => s.id === item.id);
                if (song) handlePlayTrack(song);
              }}
            />
          </div>
        </section>

        {/* Music Grid with Earnings */}
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold neon-text-music">
                  {t('music.featuredTracks')}
                </h2>
                <AdvancedFilters
                  filters={filterOptions}
                  onFilterChange={handleFilterChange}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredContent.map((song, index) => (
                  <motion.div
                    key={song.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: index * 0.1 }}
                    className={`bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-600 hover:border-amber-400 transition-all duration-300 cursor-pointer hover-glow-music relative ${
                      selectedSong === song.id ? 'ring-2 ring-amber-400 bg-amber-900 bg-opacity-20' : ''
                    }`}
                    onClick={() => handleSongClick(song)}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {/* Earn $DYO Badge */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-full">
                      <Coins className="w-3 h-3 text-amber-400" />
                      <span className="text-xs font-semibold text-amber-300">{t('music.earnAmount', { amount: song.earnPerStream.toFixed(2) })}</span>
                    </div>

                    <div className="flex items-center space-x-4">
                      <img 
                        src={song.cover} 
                        alt={song.title} 
                        className="w-16 h-16 rounded-lg object-cover"
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-white truncate">
                          {song.title}
                        </h3>
                        <p className="text-gray-400 text-sm truncate">
                          {song.artist}
                        </p>
                        <div className="flex items-center space-x-2 mt-1">
                          <span className="text-xs text-gray-500">{song.duration}</span>
                          <span className="text-xs text-gray-500">•</span>
                          <span className="text-xs text-gray-500">{song.genre}</span>
                          <span className="text-xs text-yellow-400">⭐ {song.rating}</span>
                        </div>
                        
                        {/* Earnings Info */}
                        <div className="mt-2 pt-2 border-t border-gray-700">
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1 text-amber-400">
                              <TrendingUp className="w-3 h-3" />
                              <span>{t('music.artist')}: {song.earnings.toFixed(2)} $DYO</span>
                            </div>
                            <div className="flex items-center gap-1 text-green-400">
                              <Users className="w-3 h-3" />
                              <span>{formatNumber(song.listenersEarning)} $DYO {t('music.earned')}</span>
                            </div>
                          </div>
                          <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
                            <Eye className="w-3 h-3" />
                            <span>{formatNumber(song.streams)} {t('music.streams')} • {formatNumber(song.dailyEarnings)} $DYO {t('common.today')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Monetization Education Section */}
        <section className="py-8 px-4">
          <div className="max-w-7xl mx-auto">
            <motion.div
              className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-400/30 rounded-xl p-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-start gap-4">
                <Info className="w-6 h-6 text-amber-400 flex-shrink-0 mt-1" />
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-white mb-3">{t('music.howStreamToEarnWorks')}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-300">
                    <div>
                      <h4 className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4" />
                        {t('music.forListeners')}
                      </h4>
                      <ul className="space-y-1 text-xs">
                        <li>• {t('music.earnPerStream', { amount: metrics.dyoPerStream.toFixed(2) })}</li>
                        <li>• {t('music.longerListeningMoreEarnings')}</li>
                        <li>• {t('music.dailyStreaksUnlock')}</li>
                        <li>• {t('music.supportArtistsWhileEarning')}</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-semibold text-amber-300 mb-2 flex items-center gap-2">
                        <Sparkles className="w-4 h-4" />
                        {t('music.forArtists')}
                      </h4>
                      <ul className="space-y-1 text-xs">
                        <li>• {t('music.earnFromEveryStream')}</li>
                        <li>• {t('music.higherEngagementHigherEarnings')}</li>
                        <li>• {t('music.realTimeEarningsTracking')}</li>
                        <li>• {t('music.buildFanbaseAndIncome')}</li>
                      </ul>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-amber-400/20">
                    <p className="text-xs text-gray-400">
                      <strong className="text-amber-300">{t('music.maximizeEarnings')}:</strong> {t('music.maximizeEarningsDescription')}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Earnings Modal */}
      {showEarningsModal && account && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowEarningsModal(false)}
        >
          <motion.div
            className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-amber-400/30"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Wallet className="w-6 h-6 text-amber-400" />
                {t('music.myEarnings')}
              </h3>
              <button
                onClick={() => setShowEarningsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-amber-500/20 to-orange-600/20 border border-amber-400/30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">{t('music.totalEarnings')}</div>
                <div className="text-3xl font-bold text-amber-400">{userEarnings.toFixed(2)} $DYO</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">{t('music.listeningStreak')}</div>
                  <div className="text-lg font-semibold text-white">{listeningStreak} {t('common.days')}</div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">{t('common.progress')}</div>
                  <div className="text-lg font-semibold text-white">{earningsProgress}%</div>
                </div>
              </div>
              <button
                onClick={() => setShowEarningsModal(false)}
                className="w-full py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg transition-colors"
              >
                {t('common.close')}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </SimpleAppLayout>
  );
};

export default MusicPage;
