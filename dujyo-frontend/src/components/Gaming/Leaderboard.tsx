import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Medal, Crown, Star, TrendingUp, Users } from 'lucide-react';

interface Player {
  id: string;
  username: string;
  avatar: string;
  score: number;
  level: number;
  rank: number;
  previousRank?: number;
  gamesPlayed: number;
  winRate: number;
  badges: string[];
}

interface LeaderboardProps {
  players: Player[];
  currentUserId?: string;
  onPlayerClick?: (player: Player) => void;
}

const Leaderboard: React.FC<LeaderboardProps> = ({
  players,
  currentUserId,
  onPlayerClick
}) => {
  const [sortedPlayers, setSortedPlayers] = useState<Player[]>([]);
  const [animatingRanks, setAnimatingRanks] = useState<Set<number>>(new Set());

  // Sort players by score and update ranks
  useEffect(() => {
    const sorted = [...players].sort((a, b) => b.score - a.score);
    const updatedPlayers = sorted.map((player, index) => ({
      ...player,
      previousRank: player.rank,
      rank: index + 1
    }));

    // Detect rank changes for animation
    const changedRanks = new Set<number>();
    updatedPlayers.forEach(player => {
      if (player.previousRank && player.previousRank !== player.rank) {
        changedRanks.add(player.rank);
      }
    });

    setAnimatingRanks(changedRanks);
    setSortedPlayers(updatedPlayers);

    // Clear animation flags after animation completes
    setTimeout(() => {
      setAnimatingRanks(new Set());
    }, 1000);
  }, [players]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-6 h-6 text-yellow-400" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-300" />;
      case 3:
        return <Medal className="w-6 h-6 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-400">#{rank}</span>;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      return (
        <div className={`absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center ${
          rank === 1 ? 'bg-yellow-400' : 
          rank === 2 ? 'bg-gray-300' : 
          'bg-amber-600'
        }`}>
          {getRankIcon(rank)}
        </div>
      );
    }
    return null;
  };

  const getScoreColor = (score: number) => {
    if (score >= 10000) return 'text-green-400';
    if (score >= 5000) return 'text-blue-400';
    if (score >= 1000) return 'text-purple-400';
    return 'text-gray-400';
  };

  const getWinRateColor = (winRate: number) => {
    if (winRate >= 80) return 'text-green-400';
    if (winRate >= 60) return 'text-yellow-400';
    if (winRate >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const formatScore = (score: number) => {
    if (score >= 1000000) return `${(score / 1000000).toFixed(1)}M`;
    if (score >= 1000) return `${(score / 1000).toFixed(1)}K`;
    return score.toLocaleString();
  };

  return (
    <div className="bg-gray-900 bg-opacity-50 backdrop-blur-sm rounded-lg p-6 border border-gray-700 neon-glow-gaming">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Trophy className="w-8 h-8 text-yellow-400" />
          <div>
            <h2 className="text-2xl font-bold neon-text-gaming">Global Leaderboard</h2>
            <p className="text-gray-400">Top players worldwide</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-gray-400">
          <Users className="w-5 h-5" />
          <span>{players.length} players</span>
        </div>
      </div>

      {/* Leaderboard list */}
      <div className="space-y-3">
        <AnimatePresence>
          {sortedPlayers.map((player, index) => {
            const isCurrentUser = currentUserId === player.id;
            const isAnimating = animatingRanks.has(player.rank);
            const rankChanged = player.previousRank && player.previousRank !== player.rank;
            const rankImproved = player.previousRank && player.previousRank > player.rank;

            return (
              <motion.div
                key={player.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ 
                  opacity: 1, 
                  y: 0,
                  scale: isAnimating ? 1.05 : 1,
                  boxShadow: isAnimating ? '0 0 30px rgba(57, 255, 20, 0.5)' : '0 0 10px rgba(57, 255, 20, 0.2)'
                }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ 
                  duration: 0.5, 
                  delay: index * 0.1,
                  scale: { duration: 0.3 }
                }}
                className={`relative bg-gray-800 bg-opacity-50 rounded-lg p-4 border border-gray-600 hover:border-green-400 transition-all duration-300 cursor-pointer ${
                  isCurrentUser ? 'ring-2 ring-green-400 bg-green-900 bg-opacity-20' : ''
                } ${isAnimating ? 'neon-glow-gaming' : ''}`}
                onClick={() => onPlayerClick?.(player)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {/* Rank change indicator */}
                {rankChanged && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className={`absolute -left-2 top-1/2 transform -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center ${
                      rankImproved ? 'bg-green-500' : 'bg-red-500'
                    }`}
                  >
                    <TrendingUp 
                      className={`w-4 h-4 ${
                        rankImproved ? 'text-white' : 'text-white rotate-180'
                      }`} 
                    />
                  </motion.div>
                )}

                <div className="flex items-center space-x-4">
                  {/* Rank */}
                  <div className="flex-shrink-0 w-12 flex justify-center">
                    {getRankIcon(player.rank)}
                  </div>

                  {/* Avatar */}
                  <div className="relative flex-shrink-0">
                    <img
                      src={player.avatar}
                      alt={player.username}
                      className="w-12 h-12 rounded-full border-2 border-gray-600"
                    />
                    {getRankBadge(player.rank)}
                  </div>

                  {/* Player info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <h3 className={`text-lg font-semibold truncate ${
                        isCurrentUser ? 'text-green-400' : 'text-white'
                      }`}>
                        {player.username}
                      </h3>
                      {isCurrentUser && (
                        <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                          You
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-400">
                      <span>Level {player.level}</span>
                      <span>{player.gamesPlayed} games</span>
                      <span className={getWinRateColor(player.winRate)}>
                        {player.winRate}% win rate
                      </span>
                    </div>
                  </div>

                  {/* Score */}
                  <div className="flex-shrink-0 text-right">
                    <div className={`text-xl font-bold ${getScoreColor(player.score)}`}>
                      {formatScore(player.score)}
                    </div>
                    <div className="text-xs text-gray-400">points</div>
                  </div>
                </div>

                {/* Badges */}
                {player.badges.length > 0 && (
                  <div className="flex items-center space-x-2 mt-3">
                    {player.badges.slice(0, 3).map((badge, badgeIndex) => (
                      <motion.span
                        key={badgeIndex}
                        initial={{ opacity: 0, scale: 0 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.5 + badgeIndex * 0.1 }}
                        className="badge badge-new"
                      >
                        {badge}
                      </motion.span>
                    ))}
                    {player.badges.length > 3 && (
                      <span className="text-xs text-gray-500">
                        +{player.badges.length - 3} more
                      </span>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Footer */}
      <div className="mt-6 pt-4 border-t border-gray-700">
        <div className="flex items-center justify-between text-sm text-gray-400">
          <span>Updated every 5 minutes</span>
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4" />
            <span>Competitive Season 2024</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Leaderboard;
