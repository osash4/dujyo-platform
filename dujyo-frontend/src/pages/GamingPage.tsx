import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import SimpleAppLayout from '../components/Layout/SimpleAppLayout';
import AnimatedCarousel from '../components/common/AnimatedCarousel';
import Leaderboard from '../components/Gaming/Leaderboard';
import GamingCard from '../components/Gaming/GamingCard';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useAuth } from '../auth/AuthContext';
import { useWallet } from '../hooks/useWallet';
import { useLanguage } from '../contexts/LanguageContext';
import { getApiBaseUrl } from '../utils/apiConfig';
import Logo from '../components/common/Logo';
import Breadcrumbs from '../components/common/Breadcrumbs';
import AdvancedFilters, { FilterOption } from '../components/common/AdvancedFilters';
import TrendingSection from '../components/common/TrendingSection';
import KeyboardShortcuts from '../components/common/KeyboardShortcuts';
import { Coins, TrendingUp, Users, Wallet, Info, Trophy, Sparkles, Play, Eye, Clock, Target, Award, Zap, Flame, CheckCircle, Timer, Gamepad2, Star } from 'lucide-react';

// Enhanced gaming content with earnings data
const gamingCarouselItems = [
  {
    id: '1',
    title: 'Cyberpunk Arena',
    description: 'Fight in the neon-lit streets of the future',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=800&h=400&fit=crop',
    type: 'gaming' as const,
    url: 'https://example.com/cyberpunk-arena',
    duration: '15-30 min',
    rating: 4.8,
    avgEarnings: 2.5,
    hourlyRate: 5.0,
    activePlayers: 1250
  },
  {
    id: '2',
    title: 'Neon Racing',
    description: 'High-speed racing through cyberpunk cityscapes',
    image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=800&h=400&fit=crop',
    type: 'gaming' as const,
    url: 'https://example.com/neon-racing',
    duration: '10-20 min',
    rating: 4.6,
    avgEarnings: 1.8,
    hourlyRate: 4.2,
    activePlayers: 890
  },
  {
    id: '3',
    title: 'Virtual Reality Combat',
    description: 'Immersive VR battles in digital worlds',
    image: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc696?w=800&h=400&fit=crop',
    type: 'gaming' as const,
    url: 'https://example.com/vr-combat',
    duration: '20-45 min',
    rating: 4.9,
    avgEarnings: 3.2,
    hourlyRate: 6.5,
    activePlayers: 2100
  }
];

const gamingContent = [
  {
    id: '1',
    title: 'Cyberpunk Arena',
    description: 'Fight in the neon-lit streets of the future',
    image: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?w=400&h=300&fit=crop',
    category: 'Action',
    rating: 4.8,
    players: 1250,
    price: 0,
    avgEarnings: 2.5,
    hourlyRate: 5.0,
    potentialEarnings: 15.0
  },
  {
    id: '2',
    title: 'Neon Racing',
    description: 'High-speed racing through cyberpunk cityscapes',
    image: 'https://images.unsplash.com/photo-1552820728-8b83bb6b773f?w=400&h=300&fit=crop',
    category: 'Racing',
    rating: 4.6,
    players: 890,
    price: 0,
    avgEarnings: 1.8,
    hourlyRate: 4.2,
    potentialEarnings: 12.0
  },
  {
    id: '3',
    title: 'Virtual Reality Combat',
    description: 'Immersive VR battles in digital worlds',
    image: 'https://images.unsplash.com/photo-1592478411213-6153e4ebc696?w=400&h=300&fit=crop',
    category: 'VR',
    rating: 4.9,
    players: 2100,
    price: 0,
    avgEarnings: 3.2,
    hourlyRate: 6.5,
    potentialEarnings: 20.0
  },
  {
    id: '4',
    title: 'Space Explorer',
    description: 'Explore the cosmos in this epic adventure',
    image: 'https://images.unsplash.com/photo-1446776877081-d282a0f896e2?w=400&h=300&fit=crop',
    category: 'Adventure',
    rating: 4.7,
    players: 1560,
    price: 0,
    avgEarnings: 2.2,
    hourlyRate: 4.8,
    potentialEarnings: 14.0
  },
  {
    id: '5',
    title: 'Puzzle Master',
    description: 'Challenge your mind with complex puzzles',
    image: 'https://images.unsplash.com/photo-1606092195730-5d7b9af1efc5?w=400&h=300&fit=crop',
    category: 'Puzzle',
    rating: 4.5,
    players: 750,
    price: 0,
    avgEarnings: 1.5,
    hourlyRate: 3.5,
    potentialEarnings: 10.0
  },
  {
    id: '6',
    title: 'Battle Royale',
    description: 'Last player standing in this intense battle',
    image: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=400&h=300&fit=crop',
    category: 'Battle Royale',
    rating: 4.8,
    players: 3200,
    price: 0,
    avgEarnings: 4.5,
    hourlyRate: 8.0,
    potentialEarnings: 25.0
  }
];

// Enhanced leaderboard with earnings
const mockLeaderboardData = [
  {
    id: '1',
    username: 'CyberNinja',
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=face',
    score: 125000,
    level: 45,
    rank: 1,
    gamesPlayed: 250,
    winRate: 85,
    badges: ['Champion', 'Speed Demon', 'Unstoppable'],
    weeklyEarnings: 1250.50,
    monthlyEarnings: 5200.75,
    totalEarnings: 15200.00,
    winStreak: 12
  },
  {
    id: '2',
    username: 'NeonRacer',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face',
    score: 118000,
    level: 42,
    rank: 2,
    gamesPlayed: 200,
    winRate: 82,
    badges: ['Racing Pro', 'Speed Master'],
    weeklyEarnings: 980.25,
    monthlyEarnings: 4100.50,
    totalEarnings: 12800.00,
    winStreak: 8
  },
  {
    id: '3',
    username: 'VRWarrior',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face',
    score: 110000,
    level: 40,
    rank: 3,
    gamesPlayed: 180,
    winRate: 78,
    badges: ['VR Expert', 'Combat Master'],
    weeklyEarnings: 850.75,
    monthlyEarnings: 3600.25,
    totalEarnings: 11200.00,
    winStreak: 6
  },
  {
    id: '4',
    username: 'SpaceExplorer',
    avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face',
    score: 95000,
    level: 38,
    rank: 4,
    gamesPlayed: 160,
    winRate: 75,
    badges: ['Explorer', 'Adventure Seeker'],
    weeklyEarnings: 720.50,
    monthlyEarnings: 3000.00,
    totalEarnings: 9800.00,
    winStreak: 4
  },
  {
    id: '5',
    username: 'PuzzleMaster',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
    score: 88000,
    level: 35,
    rank: 5,
    gamesPlayed: 140,
    winRate: 72,
    badges: ['Puzzle Solver', 'Thinker'],
    weeklyEarnings: 650.25,
    monthlyEarnings: 2700.75,
    totalEarnings: 8500.00,
    winStreak: 3
  }
];

// Daily Quests
interface DailyQuest {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  target: number;
  completed: boolean;
  icon: React.ElementType;
}

// Active Tournaments
interface Tournament {
  id: string;
  title: string;
  prizePool: number;
  entryFee: number;
  players: number;
  maxPlayers: number;
  endTime: Date;
  status: 'active' | 'upcoming' | 'ended';
}

// Achievements
interface Achievement {
  id: string;
  title: string;
  description: string;
  reward: number;
  progress: number;
  target: number;
  completed: boolean;
  icon: React.ElementType;
}

interface GamingMetrics {
  avgEarnPerGame: number;
  activeEarners: number;
  totalEarnedToday: number;
}

const GamingPage: React.FC = () => {
  const { playTrack, setPlayerPosition } = usePlayerContext();
  const { user } = useAuth();
  const { connect, account, isConnecting } = useWallet();
  const [selectedGame, setSelectedGame] = useState<string | null>(null);
  const [filteredContent, setFilteredContent] = useState(gamingContent);
  const [metrics, setMetrics] = useState<GamingMetrics>({
    avgEarnPerGame: 2.5,
    activeEarners: 0,
    totalEarnedToday: 0
  });
  const [userEarnings, setUserEarnings] = useState<number>(0);
  const [showEarningsModal, setShowEarningsModal] = useState(false);
  const [leaderboardFilter, setLeaderboardFilter] = useState<'all' | 'earnings'>('all');
  const [dailyQuests, setDailyQuests] = useState<DailyQuest[]>([
    { id: '1', title: 'Play 5 Games', description: 'Complete 5 games today', reward: 10, progress: 3, target: 5, completed: false, icon: Gamepad2 },
    { id: '2', title: 'Win 3 Matches', description: 'Win 3 competitive matches', reward: 15, progress: 2, target: 3, completed: false, icon: Trophy },
    { id: '3', title: 'Daily Login', description: 'Log in and play today', reward: 5, progress: 1, target: 1, completed: true, icon: Star }
  ]);
  const [tournaments, setTournaments] = useState<Tournament[]>([
    { id: '1', title: 'Cyberpunk Championship', prizePool: 5000, entryFee: 50, players: 245, maxPlayers: 500, endTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), status: 'active' },
    { id: '2', title: 'Neon Racing Grand Prix', prizePool: 3000, entryFee: 30, players: 180, maxPlayers: 300, endTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000), status: 'active' },
    { id: '3', title: 'VR Combat Tournament', prizePool: 7500, entryFee: 75, players: 320, maxPlayers: 400, endTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), status: 'active' }
  ]);
  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: '1', title: 'First Win', description: 'Win your first game', reward: 25, progress: 1, target: 1, completed: true, icon: Trophy },
    { id: '2', title: 'Perfect Game', description: 'Win without taking damage', reward: 50, progress: 0, target: 1, completed: false, icon: Star },
    { id: '3', title: 'Comeback King', description: 'Win after being 0-2 down', reward: 75, progress: 0, target: 1, completed: false, icon: Flame },
    { id: '4', title: 'Win Streak', description: 'Win 10 games in a row', reward: 100, progress: 5, target: 10, completed: false, icon: Zap }
  ]);
  const [winStreak, setWinStreak] = useState(0);
  
  // Calculate total metrics
  useEffect(() => {
    const totalPlayers = gamingContent.reduce((sum, game) => sum + game.players, 0);
    const avgEarnings = gamingContent.reduce((sum, game) => sum + game.avgEarnings, 0) / gamingContent.length;
    const totalEarned = totalPlayers * avgEarnings * 0.1; // Estimate
    
    setMetrics({
      avgEarnPerGame: avgEarnings,
      activeEarners: Math.floor(totalPlayers * 0.3),
      totalEarnedToday: totalEarned
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
      const response = await fetch(`${apiBaseUrl}/api/earnings/gaming/${account}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setUserEarnings(data.totalEarnings || 0);
        setWinStreak(data.winStreak || 0);
      }
    } catch (error) {
      console.error('Error fetching gaming earnings:', error);
    }
  };
  
  // Trending data
  const trendingGames = gamingContent.slice(0, 4).map(g => ({
    id: g.id,
    title: g.title,
    subtitle: g.category,
    image: g.image,
    type: 'gaming' as const,
    views: `${g.players} players`,
    likes: `${Math.floor(g.players * 0.1)}K`,
    trend: g.rating >= 4.8 ? 'up' as const : 'new' as const,
    earnings: g.avgEarnings
  }));
  
  // Filter options
  const filterOptions: FilterOption[] = [
    {
      id: 'category',
      label: 'Category',
      type: 'checkbox',
      options: [
        { value: 'action', label: 'Action' },
        { value: 'racing', label: 'Racing' },
        { value: 'vr', label: 'VR' },
        { value: 'adventure', label: 'Adventure' },
        { value: 'puzzle', label: 'Puzzle' }
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
    let filtered = [...gamingContent];
    
    if (filters.category && filters.category.length > 0) {
      filtered = filtered.filter(game => 
        filters.category.includes(game.category.toLowerCase())
      );
    }
    
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      filtered = filtered.filter(game =>
        game.title.toLowerCase().includes(searchLower) ||
        game.description?.toLowerCase().includes(searchLower)
      );
    }
    
    if (filters.rating) {
      const minRating = filters.rating.max / 5;
      filtered = filtered.filter(game => game.rating >= minRating);
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
    setPlayerPosition('top');
  }, [setPlayerPosition]);

  const handlePlayGame = (item: any) => {
    playTrack({
      id: item.id,
      title: item.title,
      url: item.url || `https://example.com/game/${item.id}`,
      playerMode: 'gaming',
      cover: item.image
    });
  };

  const handleGameClick = (game: any) => {
    setSelectedGame(game.id);
    handlePlayGame(game);
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

  const formatTimeRemaining = (endTime: Date): string => {
    const now = new Date();
    const diff = endTime.getTime() - now.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const filteredLeaderboard = leaderboardFilter === 'earnings' 
    ? [...mockLeaderboardData].sort((a, b) => b.weeklyEarnings - a.weeklyEarnings)
    : mockLeaderboardData;

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

              <h1 className="text-4xl md:text-6xl font-bold neon-text-gaming mb-4">
                {t('gaming.title')}
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto mb-2">
                {t('gaming.subtitle')}
              </p>
              <p className="text-sm text-emerald-400/80 font-semibold mb-6">
                {t('gaming.poweredBy')}
              </p>

              {/* Play-to-Earn Hero Metrics */}
              <motion.div
                className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
              >
                <motion.div
                  className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-400/30 rounded-xl p-4 backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Coins className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs text-gray-400">{t('gaming.avgEarnPerGame')}</span>
                  </div>
                  <motion.div
                    className="text-3xl font-bold text-emerald-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1 }}
                  >
                    {metrics.avgEarnPerGame.toFixed(2)} $DYO
                  </motion.div>
                  <p className="text-xs text-gray-400 mt-1">{t('gaming.playAndEarn')}</p>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-400/30 rounded-xl p-4 backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <Users className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs text-gray-400">{t('gaming.activeEarners')}</span>
                  </div>
                  <motion.div
                    className="text-3xl font-bold text-emerald-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.2 }}
                  >
                    {formatNumber(metrics.activeEarners)}
                  </motion.div>
                  <p className="text-xs text-gray-400 mt-1">Players earning now</p>
                </motion.div>

                <motion.div
                  className="bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-400/30 rounded-xl p-4 backdrop-blur-sm"
                  whileHover={{ scale: 1.05 }}
                >
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                    <span className="text-xs text-gray-400">Earned Today</span>
                  </div>
                  <motion.div
                    className="text-3xl font-bold text-emerald-400"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 1, delay: 0.4 }}
                  >
                    {formatNumber(metrics.totalEarnedToday)} $DYO
                  </motion.div>
                  <p className="text-xs text-gray-400 mt-1">And counting...</p>
                </motion.div>
              </motion.div>

              {/* My Gaming Earnings Button */}
              {account && (
                <motion.button
                  onClick={handleViewEarnings}
                  className="mb-6 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold rounded-lg hover:from-emerald-400 hover:to-green-500 transition-all duration-300 shadow-lg hover:shadow-emerald-500/25 flex items-center gap-2 mx-auto"
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Wallet className="w-5 h-5" />
                  <span>My Gaming Earnings: {userEarnings.toFixed(2)} $DYO</span>
                </motion.button>
              )}

              {/* Win Streak Bonus */}
              {winStreak > 0 && (
                <motion.div
                  className="max-w-md mx-auto mb-6 p-4 bg-gradient-to-r from-emerald-500/10 to-green-600/10 border border-emerald-400/30 rounded-lg"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                >
                  <div className="flex items-center justify-center gap-3">
                    <Flame className="w-5 h-5 text-emerald-400" />
                    <div>
                      <p className="text-sm font-semibold text-emerald-300">Win Streak: {winStreak} games</p>
                      <p className="text-xs text-gray-400">Earning {winStreak * 0.5}x bonus $DYO</p>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Featured Games Carousel */}
            <div className="mb-12">
              <AnimatedCarousel
                items={gamingCarouselItems}
                section="gaming"
                onPlay={handlePlayGame}
                autoPlay={true}
                autoPlayInterval={6000}
              />
            </div>
          </motion.div>
        </section>

        {/* Daily Gaming Quests */}
        <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Target className="w-6 h-6 text-emerald-400" />
                  Daily Quests
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {dailyQuests.map((quest, idx) => {
                  const QuestIcon = quest.icon;
                  return (
                    <motion.div
                      key={quest.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className={`bg-gray-800/50 border rounded-lg p-4 backdrop-blur-sm ${
                        quest.completed ? 'border-emerald-400 border-2' : 'border-gray-600'
                      }`}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${
                          quest.completed ? 'bg-emerald-500/20' : 'bg-gray-700'
                        }`}>
                          <QuestIcon className={`w-5 h-5 ${quest.completed ? 'text-emerald-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-sm">{quest.title}</h3>
                          <p className="text-xs text-gray-400">{quest.description}</p>
                        </div>
                        {quest.completed && (
                          <CheckCircle className="w-5 h-5 text-emerald-400" />
                        )}
                      </div>
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-400 mb-1">
                          <span>Progress</span>
                          <span>{quest.progress}/{quest.target}</span>
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-2">
                          <motion.div
                            className={`h-2 rounded-full ${
                              quest.completed ? 'bg-emerald-500' : 'bg-emerald-500/50'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${(quest.progress / quest.target) * 100}%` }}
                            transition={{ duration: 0.5 }}
                          />
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">Reward</span>
                        <span className="text-sm font-bold text-emerald-400">{quest.reward} $DYO</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Tournaments & Events */}
        <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Trophy className="w-6 h-6 text-emerald-400" />
                  Active Tournaments
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tournaments.map((tournament, idx) => (
                  <motion.div
                    key={tournament.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: idx * 0.1 }}
                    className="bg-gray-800/50 border border-emerald-400/30 rounded-lg p-4 backdrop-blur-sm relative overflow-hidden"
                    whileHover={{ scale: 1.02 }}
                  >
                    {/* Pulsing animation for active tournaments */}
                    {tournament.status === 'active' && (
                      <motion.div
                        className="absolute top-0 right-0 w-3 h-3 bg-emerald-400 rounded-full"
                        animate={{
                          scale: [1, 1.5, 1],
                          opacity: [1, 0.5, 1]
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                      />
                    )}
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-bold text-white">{tournament.title}</h3>
                      <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded">
                        {tournament.status}
                      </span>
                    </div>
                    <div className="space-y-2 text-sm mb-3">
                      <div className="flex items-center gap-2 text-emerald-400">
                        <Coins className="w-4 h-4" />
                        <span className="font-semibold">Prize Pool: {tournament.prizePool.toFixed(2)} $DYO</span>
                      </div>
                      <div className="flex items-center justify-between text-gray-400">
                        <span>Entry Fee: {tournament.entryFee} $DYO</span>
                        <span>{tournament.players}/{tournament.maxPlayers} players</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mb-3">
                      <Timer className="w-4 h-4" />
                      <span>Ends in: {formatTimeRemaining(tournament.endTime)}</span>
                    </div>
                    <button className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors text-sm font-medium">
                      Join Tournament
                    </button>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Gaming Achievements */}
        <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold text-white flex items-center gap-3">
                  <Award className="w-6 h-6 text-emerald-400" />
                  Achievements
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {achievements.map((achievement, idx) => {
                  const AchievementIcon = achievement.icon;
                  return (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: idx * 0.1 }}
                      className={`bg-gray-800/50 border rounded-lg p-4 backdrop-blur-sm ${
                        achievement.completed ? 'border-emerald-400 border-2' : 'border-gray-600'
                      }`}
                      whileHover={{ scale: 1.02 }}
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <div className={`p-2 rounded-lg ${
                          achievement.completed ? 'bg-emerald-500/20' : 'bg-gray-700'
                        }`}>
                          <AchievementIcon className={`w-5 h-5 ${achievement.completed ? 'text-emerald-400' : 'text-gray-400'}`} />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-semibold text-white text-sm">{achievement.title}</h3>
                          <p className="text-xs text-gray-400">{achievement.description}</p>
                        </div>
                      </div>
                      {!achievement.completed && achievement.target > 1 && (
                        <div className="mb-2">
                          <div className="flex justify-between text-xs text-gray-400 mb-1">
                            <span>Progress</span>
                            <span>{achievement.progress}/{achievement.target}</span>
                          </div>
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <motion.div
                              className="h-2 rounded-full bg-emerald-500/50"
                              initial={{ width: 0 }}
                              animate={{ width: `${(achievement.progress / achievement.target) * 100}%` }}
                              transition={{ duration: 0.5 }}
                            />
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-gray-400">Reward</span>
                        <span className="text-sm font-bold text-emerald-400">{achievement.reward} $DYO</span>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          </div>
        </section>

        {/* Trending Section */}
        <section className="py-8 px-4" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="max-w-7xl mx-auto">
            <TrendingSection
              items={trendingGames}
              onItemClick={(item) => {
                const game = gamingContent.find(g => g.id === item.id);
                if (game) handleGameClick(game);
              }}
            />
          </div>
        </section>

        {/* Main Content Grid */}
        <div className="max-w-7xl mx-auto px-4 py-8" style={{ backgroundColor: 'var(--bg-primary)' }}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Games Grid */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.2 }}
              >
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-3xl font-bold neon-text-gaming">
                    Featured Games
                  </h2>
                  <AdvancedFilters
                    filters={filterOptions}
                    onFilterChange={handleFilterChange}
                  />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredContent.map((game, index) => (
                    <motion.div
                      key={game.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: index * 0.1 }}
                      className="relative"
                    >
                      {/* Earn $DYO Badge */}
                      <div className="absolute top-2 right-2 z-10 flex items-center gap-1 px-2 py-1 bg-gradient-to-r from-emerald-500/20 to-green-600/20 border border-emerald-400/30 rounded-full">
                        <Coins className="w-3 h-3 text-emerald-400" />
                        <span className="text-xs font-semibold text-emerald-300">Earn {game.avgEarnings.toFixed(2)} $DYO</span>
                      </div>
                      <GamingCard
                        game={{
                          ...game,
                          // Add earnings info to game object
                          earningsInfo: {
                            avgEarnings: game.avgEarnings,
                            hourlyRate: game.hourlyRate,
                            potentialEarnings: game.potentialEarnings
                          }
                        }}
                        onPlay={() => handleGameClick(game)}
                        isSelected={selectedGame === game.id}
                      />
                      {/* Earnings Info Overlay */}
                      <div className="mt-2 p-2 bg-gray-800/50 rounded-lg border border-emerald-400/20">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1 text-emerald-400">
                            <Clock className="w-3 h-3" />
                            <span>{game.hourlyRate.toFixed(1)} $DYO/hr</span>
                          </div>
                          <div className="text-gray-400">
                            Up to {game.potentialEarnings.toFixed(1)} $DYO
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            </div>

            {/* Leaderboard Sidebar with Earnings */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.6, delay: 0.4 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-white">Leaderboard</h3>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setLeaderboardFilter('all')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        leaderboardFilter === 'all'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setLeaderboardFilter('earnings')}
                      className={`px-3 py-1 text-xs rounded-lg transition-colors ${
                        leaderboardFilter === 'earnings'
                          ? 'bg-emerald-500 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      Top Earners
                    </button>
                  </div>
                </div>
                <Leaderboard
                  players={filteredLeaderboard.map(player => ({
                    ...player,
                    // Add earnings display
                    earnings: player.weeklyEarnings,
                    monthlyEarnings: player.monthlyEarnings,
                    totalEarnings: player.totalEarnings,
                    winStreak: player.winStreak
                  }))}
                  currentUserId="current-user-id"
                  onPlayerClick={(player) => {
                    console.log('Player clicked:', player);
                  }}
                />
              </motion.div>
            </div>
          </div>
        </div>

        {/* Gaming Stats Section */}
        <section className="py-12 px-4 bg-gray-800 bg-opacity-50">
          <div className="max-w-7xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
              className="text-center"
            >
              <h2 className="text-3xl font-bold neon-text-gaming mb-8">
                Gaming Statistics
              </h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="bg-gray-900 bg-opacity-50 rounded-lg p-6 neon-glow-gaming">
                  <div className="text-4xl font-bold neon-text-gaming mb-2">
                    {formatNumber(metrics.activeEarners)}
                  </div>
                  <div className="text-gray-400">Active Earners</div>
                </div>
                
                <div className="bg-gray-900 bg-opacity-50 rounded-lg p-6 neon-glow-gaming">
                  <div className="text-4xl font-bold neon-text-gaming mb-2">
                    {formatNumber(metrics.totalEarnedToday)}
                  </div>
                  <div className="text-gray-400">$DYO Earned Today</div>
                </div>
                
                <div className="bg-gray-900 bg-opacity-50 rounded-lg p-6 neon-glow-gaming">
                  <div className="text-4xl font-bold neon-text-gaming mb-2">
                    98.5%
                  </div>
                  <div className="text-gray-400">Uptime</div>
                </div>
              </div>
            </motion.div>
          </div>
        </section>
      </div>

      {/* Player Earnings Modal */}
      {showEarningsModal && account && (
        <motion.div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={() => setShowEarningsModal(false)}
        >
          <motion.div
            className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-emerald-400/30"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                <Wallet className="w-6 h-6 text-emerald-400" />
                My Gaming Earnings
              </h3>
              <button
                onClick={() => setShowEarningsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                ×
              </button>
            </div>
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-emerald-500/20 to-green-600/20 border border-emerald-400/30 rounded-lg p-4">
                <div className="text-sm text-gray-400 mb-1">Total Earnings</div>
                <div className="text-3xl font-bold text-emerald-400">{userEarnings.toFixed(2)} $DYO</div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Win Streak</div>
                  <div className="text-lg font-semibold text-white flex items-center gap-1">
                    <Flame className="w-4 h-4 text-emerald-400" />
                    {winStreak} games
                  </div>
                </div>
                <div className="bg-gray-700/50 rounded-lg p-3">
                  <div className="text-xs text-gray-400 mb-1">Games Played</div>
                  <div className="text-lg font-semibold text-white">125</div>
                </div>
              </div>
              <div className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-2">Earnings History</div>
                <div className="text-sm text-gray-300">Last 7 days: 125.50 $DYO</div>
                <div className="text-sm text-gray-300">Last 30 days: 520.75 $DYO</div>
              </div>
              <button
                onClick={() => setShowEarningsModal(false)}
                className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg transition-colors"
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

export default GamingPage;
