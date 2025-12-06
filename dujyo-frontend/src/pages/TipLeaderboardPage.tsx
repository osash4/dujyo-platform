import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Trophy, Heart, Coins, Users, TrendingUp, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../auth/AuthContext';
import { getApiBaseUrl } from '../utils/apiConfig';
import { TipButton } from '../components/tips/TipButton';

interface TipLeaderboardEntry {
  artist_address: string;
  artist_name?: string;
  tip_count: number;
  total_received: number;
  rank: number;
}

const TipLeaderboardPage: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<TipLeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('Please log in to view the leaderboard');
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/content/tips/leaderboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to load leaderboard');
      }

      const data = await response.json();
      if (data.success && data.leaderboard) {
        const entries = Array.isArray(data.leaderboard) ? data.leaderboard : [];
        // Add rank to each entry
        const rankedEntries = entries.map((entry: TipLeaderboardEntry, index: number) => ({
          ...entry,
          rank: index + 1
        }));
        setLeaderboard(rankedEntries);
      } else {
        setLeaderboard([]);
      }
    } catch (err) {
      console.error('Error loading tip leaderboard:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Trophy className="w-8 h-8 text-yellow-400" />;
      case 2:
        return <Trophy className="w-8 h-8 text-gray-300" />;
      case 3:
        return <Trophy className="w-8 h-8 text-amber-600" />;
      default:
        return <span className="text-lg font-bold text-gray-400">#{rank}</span>;
    }
  };

  const getRankBadge = (rank: number) => {
    if (rank <= 3) {
      return (
        <div className={`absolute -top-2 -right-2 w-10 h-10 rounded-full flex items-center justify-center ${
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-amber-500 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading leaderboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <div className="text-red-400 mb-4 text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Error Loading Leaderboard</h2>
          <p className="text-gray-400 mb-6">{error}</p>
          <button
            onClick={loadLeaderboard}
            className="px-6 py-3 bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-all"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white p-4 sm:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 text-gray-400 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span>Back</span>
          </button>
          
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
              <Heart className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold mb-2">Top Tipped Artists</h1>
              <p className="text-gray-400">Most supported artists on DUJYO</p>
            </div>
          </div>
        </motion.div>

        {/* Leaderboard */}
        {leaderboard.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-16 bg-gray-800/50 rounded-xl border border-gray-700"
          >
            <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-xl font-bold text-white mb-2">No Tips Yet</h3>
            <p className="text-gray-400">Be the first to support your favorite artists!</p>
          </motion.div>
        ) : (
          <div className="space-y-4">
            {leaderboard.map((entry, index) => (
              <motion.div
                key={entry.artist_address}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700 hover:border-pink-500/50 transition-all"
              >
                {getRankBadge(entry.rank)}
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Rank */}
                    <div className="flex-shrink-0 w-12 text-center">
                      {entry.rank <= 3 ? (
                        getRankIcon(entry.rank)
                      ) : (
                        <span className="text-2xl font-bold text-gray-400">#{entry.rank}</span>
                      )}
                    </div>

                    {/* Artist Info */}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xl font-bold text-white mb-1 truncate">
                        {entry.artist_name || `Artist ${entry.rank}`}
                      </h3>
                      <p className="text-sm text-gray-400 font-mono truncate">
                        {entry.artist_address}
                      </p>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-6 flex-shrink-0">
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-amber-400 mb-1">
                          <Coins className="w-5 h-5" />
                          <span className="text-2xl font-bold">
                            {entry.total_received.toFixed(2)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400">DYO Received</p>
                      </div>
                      
                      <div className="text-center">
                        <div className="flex items-center gap-1 text-pink-400 mb-1">
                          <Heart className="w-5 h-5" />
                          <span className="text-2xl font-bold">{entry.tip_count}</span>
                        </div>
                        <p className="text-xs text-gray-400">Tips</p>
                      </div>
                    </div>

                    {/* Tip Button */}
                    {user?.uid !== entry.artist_address && (
                      <div className="flex-shrink-0">
                        <TipButton
                          artistAddress={entry.artist_address}
                          artistName={entry.artist_name || `Artist ${entry.rank}`}
                          presetAmounts={[1, 5, 10, 25]}
                          compact={true}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* Info Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="mt-8 bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-xl p-6"
        >
          <div className="flex items-start gap-4">
            <Heart className="w-8 h-8 text-pink-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-white mb-2">About Tips</h3>
              <p className="text-gray-300 mb-4">
                Support your favorite artists by sending them DYO tokens. Tips are a direct way to show appreciation 
                for their content and help them continue creating amazing music, videos, and games.
              </p>
              <ul className="space-y-2 text-gray-300">
                <li className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-pink-400" />
                  <span>Artists receive tips instantly in their wallet</span>
                </li>
                <li className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-pink-400" />
                  <span>Top supporters are recognized on artist profiles</span>
                </li>
                <li className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-pink-400" />
                  <span>Leaderboard updates in real-time</span>
                </li>
              </ul>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default TipLeaderboardPage;

