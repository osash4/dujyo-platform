//! Gamification System for Dujyo
//! 
//! This component provides comprehensive gamification:
//! - Daily login rewards
//! - Achievement system
//! - Levels and XP
//! - Badges and collectibles
//! - Streaks and challenges
//! - Leaderboards

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Trophy,
  Star,
  Zap,
  Target,
  Award,
  TrendingUp,
  Calendar,
  Gift,
  Crown,
  Medal,
  Fire,
  Clock,
  Users,
  ChevronRight,
  CheckCircle,
  Lock,
  Unlock,
} from 'lucide-react';

// ===========================================
// TYPES & INTERFACES
// ===========================================

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  xp: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  unlockedAt?: Date;
  progress: number;
  maxProgress: number;
  category: string;
}

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  rarity: 'bronze' | 'silver' | 'gold' | 'platinum';
  unlocked: boolean;
  unlockedAt?: Date;
  category: string;
}

interface DailyReward {
  day: number;
  reward: {
    type: 'xp' | 'tokens' | 'badge';
    amount: number;
    item?: string;
  };
  claimed: boolean;
  streak: number;
}

interface UserStats {
  level: number;
  xp: number;
  xpToNext: number;
  totalXp: number;
  streak: number;
  achievements: number;
  badges: number;
  rank: number;
}

// ===========================================
// GAMIFICATION SYSTEM COMPONENT
// ===========================================

const GamificationSystem: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rewards' | 'achievements' | 'badges' | 'leaderboard'>('rewards');
  const [userStats, setUserStats] = useState<UserStats>({
    level: 5,
    xp: 1250,
    xpToNext: 750,
    totalXp: 8750,
    streak: 7,
    achievements: 12,
    badges: 8,
    rank: 42,
  });

  const [achievements, setAchievements] = useState<Achievement[]>([
    {
      id: 'first_stream',
      title: 'First Stream',
      description: 'Stream your first song',
      icon: <Zap className="w-6 h-6" />,
      xp: 100,
      rarity: 'common',
      unlocked: true,
      unlockedAt: new Date('2024-01-15'),
      progress: 1,
      maxProgress: 1,
      category: 'streaming',
    },
    {
      id: 'music_lover',
      title: 'Music Lover',
      description: 'Stream 100 songs',
      icon: <Star className="w-6 h-6" />,
      xp: 500,
      rarity: 'rare',
      unlocked: false,
      progress: 67,
      maxProgress: 100,
      category: 'streaming',
    },
    {
      id: 'social_butterfly',
      title: 'Social Butterfly',
      description: 'Follow 50 users',
      icon: <Users className="w-6 h-6" />,
      xp: 300,
      rarity: 'rare',
      unlocked: false,
      progress: 23,
      maxProgress: 50,
      category: 'social',
    },
  ]);

  const [badges, setBadges] = useState<Badge[]>([
    {
      id: 'early_adopter',
      name: 'Early Adopter',
      description: 'Joined Dujyo in the first month',
      icon: <Crown className="w-6 h-6" />,
      rarity: 'platinum',
      unlocked: true,
      unlockedAt: new Date('2024-01-01'),
      category: 'special',
    },
    {
      id: 'streak_master',
      name: 'Streak Master',
      description: 'Maintain a 30-day login streak',
      icon: <Fire className="w-6 h-6" />,
      rarity: 'gold',
      unlocked: false,
      category: 'daily',
    },
  ]);

  const [dailyRewards, setDailyRewards] = useState<DailyReward[]>([
    { day: 1, reward: { type: 'xp', amount: 50 }, claimed: true, streak: 1 },
    { day: 2, reward: { type: 'tokens', amount: 10 }, claimed: true, streak: 2 },
    { day: 3, reward: { type: 'xp', amount: 75 }, claimed: true, streak: 3 },
    { day: 4, reward: { type: 'tokens', amount: 15 }, claimed: true, streak: 4 },
    { day: 5, reward: { type: 'xp', amount: 100 }, claimed: true, streak: 5 },
    { day: 6, reward: { type: 'tokens', amount: 20 }, claimed: true, streak: 6 },
    { day: 7, reward: { type: 'badge', amount: 1, item: 'Weekly Warrior' }, claimed: false, streak: 7 },
  ]);

  const [leaderboard, setLeaderboard] = useState([
    { rank: 1, username: 'CryptoKing', xp: 25000, level: 15, avatar: '👑' },
    { rank: 2, username: 'MusicMaven', xp: 22000, level: 14, avatar: '🎵' },
    { rank: 3, username: 'StreamMaster', xp: 20000, level: 13, avatar: '🎮' },
    { rank: 4, username: 'NFTCollector', xp: 18000, level: 12, avatar: '🖼️' },
    { rank: 5, username: 'DeFiDancer', xp: 16000, level: 11, avatar: '💃' },
  ]);

  const claimDailyReward = (day: number) => {
    setDailyRewards(prev => prev.map(reward => 
      reward.day === day ? { ...reward, claimed: true } : reward
    ));
    
    // Update user stats
    const reward = dailyRewards.find(r => r.day === day);
    if (reward) {
      if (reward.reward.type === 'xp') {
        setUserStats(prev => ({
          ...prev,
          xp: prev.xp + reward.reward.amount,
          totalXp: prev.totalXp + reward.reward.amount,
        }));
      }
    }
  };

  const getRarityColor = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'text-gray-400';
      case 'rare': return 'text-blue-400';
      case 'epic': return 'text-purple-400';
      case 'legendary': return 'text-yellow-400';
      case 'bronze': return 'text-orange-400';
      case 'silver': return 'text-gray-300';
      case 'gold': return 'text-yellow-400';
      case 'platinum': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  const getRarityBg = (rarity: string) => {
    switch (rarity) {
      case 'common': return 'bg-gray-800';
      case 'rare': return 'bg-blue-900/30';
      case 'epic': return 'bg-purple-900/30';
      case 'legendary': return 'bg-yellow-900/30';
      case 'bronze': return 'bg-orange-900/30';
      case 'silver': return 'bg-gray-800';
      case 'gold': return 'bg-yellow-900/30';
      case 'platinum': return 'bg-purple-900/30';
      default: return 'bg-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-green-500 mb-2">Gamification Center</h1>
          <p className="text-gray-400">Level up, earn rewards, and compete with the community</p>
        </div>

        {/* User Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-gray-800 p-6 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Level</p>
                <p className="text-2xl font-bold text-blue-500">{userStats.level}</p>
              </div>
              <Trophy className="w-8 h-8 text-blue-500" />
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-sm text-gray-400 mb-1">
                <span>XP Progress</span>
                <span>{userStats.xp}/{userStats.xp + userStats.xpToNext}</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${(userStats.xp / (userStats.xp + userStats.xpToNext)) * 100}%` }}
                />
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-gray-800 p-6 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Streak</p>
                <p className="text-2xl font-bold text-orange-500">{userStats.streak} days</p>
              </div>
              <Fire className="w-8 h-8 text-orange-500" />
            </div>
            <p className="text-sm text-gray-400 mt-2">Keep it going!</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-gray-800 p-6 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Achievements</p>
                <p className="text-2xl font-bold text-green-500">{userStats.achievements}</p>
              </div>
              <Award className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-sm text-gray-400 mt-2">Unlocked</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-gray-800 p-6 rounded-lg"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Rank</p>
                <p className="text-2xl font-bold text-purple-500">#{userStats.rank}</p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
            <p className="text-sm text-gray-400 mt-2">Global leaderboard</p>
          </motion.div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex space-x-1 mb-8 bg-gray-800 p-1 rounded-lg">
          {[
            { id: 'rewards', label: 'Daily Rewards', icon: <Gift className="w-4 h-4" /> },
            { id: 'achievements', label: 'Achievements', icon: <Trophy className="w-4 h-4" /> },
            { id: 'badges', label: 'Badges', icon: <Medal className="w-4 h-4" /> },
            { id: 'leaderboard', label: 'Leaderboard', icon: <Users className="w-4 h-4" /> },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-md transition-all ${
                activeTab === tab.id
                  ? 'bg-green-600 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === 'rewards' && (
            <motion.div
              key="rewards"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Calendar className="w-6 h-6 mr-2 text-green-500" />
                  Daily Rewards
                </h2>
                <p className="text-gray-400 mb-6">Claim your daily rewards and maintain your streak!</p>
                
                <div className="grid grid-cols-7 gap-4">
                  {dailyRewards.map((reward, index) => (
                    <motion.div
                      key={reward.day}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className={`relative p-4 rounded-lg border-2 ${
                        reward.claimed
                          ? 'bg-green-900/30 border-green-500'
                          : reward.day === 7
                          ? 'bg-purple-900/30 border-purple-500'
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    >
                      <div className="text-center">
                        <div className="text-2xl font-bold mb-2">Day {reward.day}</div>
                        <div className="text-sm mb-3">
                          {reward.reward.type === 'xp' && (
                            <div className="flex items-center justify-center">
                              <Star className="w-4 h-4 mr-1 text-yellow-400" />
                              <span>{reward.reward.amount} XP</span>
                            </div>
                          )}
                          {reward.reward.type === 'tokens' && (
                            <div className="flex items-center justify-center">
                              <Zap className="w-4 h-4 mr-1 text-green-400" />
                              <span>{reward.reward.amount} DYO</span>
                            </div>
                          )}
                          {reward.reward.type === 'badge' && (
                            <div className="flex items-center justify-center">
                              <Medal className="w-4 h-4 mr-1 text-purple-400" />
                              <span>Badge</span>
                            </div>
                          )}
                        </div>
                        
                        {reward.claimed ? (
                          <CheckCircle className="w-6 h-6 text-green-400 mx-auto" />
                        ) : reward.day === 7 ? (
                          <button
                            onClick={() => claimDailyReward(reward.day)}
                            className="w-full py-2 bg-purple-600 hover:bg-purple-700 rounded text-sm font-medium transition-colors"
                          >
                            Claim
                          </button>
                        ) : (
                          <Lock className="w-6 h-6 text-gray-500 mx-auto" />
                        )}
                      </div>
                      
                      {reward.day === 7 && (
                        <div className="absolute -top-2 -right-2 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                          Bonus!
                        </div>
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'achievements' && (
            <motion.div
              key="achievements"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Trophy className="w-6 h-6 mr-2 text-yellow-500" />
                  Achievements
                </h2>
                <p className="text-gray-400 mb-6">Complete challenges to unlock achievements and earn XP!</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {achievements.map((achievement, index) => (
                    <motion.div
                      key={achievement.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border-2 ${
                        achievement.unlocked
                          ? 'bg-green-900/30 border-green-500'
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`p-2 rounded-lg ${getRarityBg(achievement.rarity)}`}>
                          <div className={getRarityColor(achievement.rarity)}>
                            {achievement.icon}
                          </div>
                        </div>
                        
                        <div className="flex-1">
                          <h3 className="font-semibold text-white mb-1">{achievement.title}</h3>
                          <p className="text-sm text-gray-400 mb-2">{achievement.description}</p>
                          
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-sm font-medium ${getRarityColor(achievement.rarity)}`}>
                              {achievement.rarity.toUpperCase()}
                            </span>
                            <span className="text-sm text-yellow-400">+{achievement.xp} XP</span>
                          </div>
                          
                          <div className="w-full bg-gray-700 rounded-full h-2">
                            <div 
                              className="bg-green-500 h-2 rounded-full transition-all duration-500"
                              style={{ width: `${(achievement.progress / achievement.maxProgress) * 100}%` }}
                            />
                          </div>
                          
                          <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>{achievement.progress}/{achievement.maxProgress}</span>
                            {achievement.unlocked && (
                              <span className="text-green-400">Unlocked!</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'badges' && (
            <motion.div
              key="badges"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Medal className="w-6 h-6 mr-2 text-purple-500" />
                  Badges
                </h2>
                <p className="text-gray-400 mb-6">Collect rare badges to show off your accomplishments!</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {badges.map((badge, index) => (
                    <motion.div
                      key={badge.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-lg border-2 ${
                        badge.unlocked
                          ? 'bg-green-900/30 border-green-500'
                          : 'bg-gray-700 border-gray-600'
                      }`}
                    >
                      <div className="text-center">
                        <div className={`inline-flex p-3 rounded-full mb-3 ${getRarityBg(badge.rarity)}`}>
                          <div className={getRarityColor(badge.rarity)}>
                            {badge.icon}
                          </div>
                        </div>
                        
                        <h3 className="font-semibold text-white mb-1">{badge.name}</h3>
                        <p className="text-sm text-gray-400 mb-2">{badge.description}</p>
                        
                        <div className="flex items-center justify-center space-x-2">
                          <span className={`text-sm font-medium ${getRarityColor(badge.rarity)}`}>
                            {badge.rarity.toUpperCase()}
                          </span>
                          {badge.unlocked ? (
                            <CheckCircle className="w-4 h-4 text-green-400" />
                          ) : (
                            <Lock className="w-4 h-4 text-gray-500" />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'leaderboard' && (
            <motion.div
              key="leaderboard"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="space-y-6"
            >
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-4 flex items-center">
                  <Users className="w-6 h-6 mr-2 text-blue-500" />
                  Global Leaderboard
                </h2>
                <p className="text-gray-400 mb-6">See how you rank against other Dujyo users!</p>
                
                <div className="space-y-3">
                  {leaderboard.map((user, index) => (
                    <motion.div
                      key={user.rank}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`flex items-center justify-between p-4 rounded-lg ${
                        user.rank <= 3 ? 'bg-gradient-to-r from-yellow-900/30 to-orange-900/30' : 'bg-gray-700'
                      }`}
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-gray-600 text-sm font-bold">
                          {user.rank <= 3 ? (
                            user.rank === 1 ? '🥇' : user.rank === 2 ? '🥈' : '🥉'
                          ) : (
                            user.rank
                          )}
                        </div>
                        
                        <div className="text-2xl">{user.avatar}</div>
                        
                        <div>
                          <h3 className="font-semibold text-white">{user.username}</h3>
                          <p className="text-sm text-gray-400">Level {user.level}</p>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="font-semibold text-white">{user.xp.toLocaleString()} XP</p>
                        <p className="text-sm text-gray-400">Total</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default GamificationSystem;
