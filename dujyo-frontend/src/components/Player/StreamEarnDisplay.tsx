import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, 
  TrendingUp, 
  Clock, 
  Zap,
  Music,
  DollarSign,
  X,
  ShoppingBag,
  Image
} from 'lucide-react';
import { usePlayerContext } from '../../contexts/PlayerContext';
import { useAuth } from '../../auth/AuthContext';
import { useUnifiedBalance } from '../../hooks/useUnifiedBalance';

interface EarnNotification {
  id: string;
  type: 'artist' | 'listener';
  amount: number;
  timestamp: number;
}

const StreamEarnDisplay: React.FC = () => {
  const { currentTrack, isPlaying, streamEarnData } = usePlayerContext();
  const { getUserRole } = useAuth();
  const [notifications, setNotifications] = useState<EarnNotification[]>([]);
  const [showPanel, setShowPanel] = useState(false);
  
  const userRole = getUserRole();
  
  // ✅ Usar balance REAL del blockchain en lugar de valores locales acumulados
  const { available_dyo, dys, isUpdating: isBalanceUpdating } = useUnifiedBalance();
  const totalEarned = available_dyo; // Balance real del blockchain

  // Listen for real-time earnings updates from backend
  useEffect(() => {
    const handleEarningsUpdate = (event: CustomEvent) => {
      const { earned } = event.detail || {};
      if (earned > 0) {
        const newNotification: EarnNotification = {
          id: Date.now().toString(),
          type: streamEarnData.artistTokens > streamEarnData.listenerTokens ? 'artist' : 'listener',
          amount: earned,
          timestamp: Date.now()
        };

        setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep only last 5
      }
    };

    window.addEventListener('dujyo:balance-updated', handleEarningsUpdate as EventListener);
    return () => window.removeEventListener('dujyo:balance-updated', handleEarningsUpdate as EventListener);
  }, [streamEarnData.artistTokens, streamEarnData.listenerTokens]);

  // Auto-remove notifications after 5 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      setNotifications(prev => prev.slice(0, -1));
    }, 5000);

    return () => clearTimeout(timer);
  }, [notifications]);

  if (!currentTrack || !isPlaying) {
    return null;
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getDailyProgress = () => {
    return (streamEarnData.dailyEarned / streamEarnData.dailyLimit) * 100;
  };

  return (
    <>
      {/* Floating Earn Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowPanel(!showPanel)}
        className={`fixed bottom-20 left-4 z-50 bg-gradient-to-r ${
          isBalanceUpdating 
            ? 'from-orange-500 to-purple-500' 
            : 'from-yellow-500 to-orange-500'
        } hover:from-yellow-600 hover:to-orange-600 text-white p-4 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-3 min-w-[200px]`}
      >
        <Coins size={20} className={isBalanceUpdating ? 'animate-pulse' : ''} />
        <span className="font-bold">{totalEarned.toFixed(2)} DYO</span>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        >
          <Zap size={16} />
        </motion.div>
      </motion.button>

      {/* Earn Notifications */}
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, x: 300, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 300, scale: 0.8 }}
            className="fixed top-4 right-4 z-50 bg-gray-800 border border-gray-700 rounded-lg p-4 shadow-lg max-w-sm"
          >
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${
                notification.type === 'artist' 
                  ? 'bg-pink-500/20' 
                  : 'bg-blue-500/20'
              }`}>
                {notification.type === 'artist' ? (
                  <Music size={16} className="text-orange-400" />
                ) : (
                  <TrendingUp size={16} className="text-blue-400" />
                )}
              </div>
              <div>
                <p className="text-white font-semibold">
                  +{notification.amount} DYO
                </p>
                <p className="text-gray-400 text-sm">
                  {notification.type === 'artist' ? 'Artist Reward' : 'Listener Reward'}
                </p>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      {/* Detailed Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed bottom-20 left-4 z-50 bg-gray-800 border border-gray-700 rounded-xl p-6 shadow-2xl max-w-sm w-96"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Coins size={20} className="text-yellow-400" />
                Stream Earnings
              </h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Track */}
            <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Music size={16} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{currentTrack.title}</p>
                  <p className="text-gray-400 text-sm truncate">{currentTrack.artist}</p>
                </div>
              </div>
            </div>

            {/* Earnings Breakdown */}
            <div className="space-y-3 mb-4">
              {/* Solo mostrar ganancias de artista si el usuario es artista */}
              {userRole === 'artist' && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Music size={16} className="text-orange-400" />
                    <span className="text-gray-300">Artist Earnings</span>
                  </div>
                  <span className="text-orange-400 font-semibold">
                    {streamEarnData.artistTokens} DYO
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp size={16} className="text-blue-400" />
                  <span className="text-gray-300">Listener Rewards</span>
                </div>
                <span className="text-blue-400 font-semibold">
                  {streamEarnData.listenerTokens} DYO
                </span>
              </div>

              <div className="border-t border-gray-700 pt-3">
                <div className="flex items-center justify-between">
                  <span className="text-white font-semibold flex items-center gap-2">
                    Total Balance
                    {isBalanceUpdating && (
                      <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                    )}
                  </span>
                  <div className="text-right">
                    <div className="text-yellow-400 font-bold text-lg">
                      {totalEarned.toFixed(2)} DYO
                    </div>
                    {dys > 0 && (
                      <div className="text-gray-400 text-xs">
                        + {dys.toFixed(2)} DYS
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Daily Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Daily Progress</span>
                <span className="text-gray-400">
                  {streamEarnData.dailyEarned.toFixed(1)} / {streamEarnData.dailyLimit} min
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-yellow-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${Math.min(getDailyProgress(), 100)}%` }}
                />
              </div>
            </div>

            {/* Stream Time */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-gray-400">Stream Time</span>
                </div>
                <span className="text-white font-medium">
                  {formatTime(streamEarnData.totalStreamTime)}
                </span>
              </div>
            </div>

            {/* Earning Rate Info */}
            <div className="mt-3 p-3 bg-gray-700/30 rounded-lg">
              <p className="text-gray-400 text-xs">
                💡 <strong>Earning Rate:</strong><br/>
                • Artists: 2.5 DYO/min (max 180 min/day)<br/>
                • Listeners: 0.6 DYO/min (max 120 min/day)<br/>
                • Bonus: Early Adopter, Genre Explorer, Streak Master
              </p>
            </div>

            {/* Use Earnings Section */}
            {totalEarned > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-white font-semibold mb-3 flex items-center gap-2">
                  <DollarSign size={16} className="text-green-400" />
                  Use Your Earnings
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      // Navigate to NFT marketplace
                      window.location.href = '/nft-marketplace';
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                  >
                    <Image size={14} />
                    Buy NFTs
                  </button>
                  <button
                    onClick={() => {
                      // Navigate to merch store
                      window.location.href = '/merch-store';
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-orange-500/20 border border-orange-500/50 text-orange-400 rounded-lg hover:bg-orange-500/30 transition-colors text-sm"
                  >
                    <ShoppingBag size={14} />
                    Buy Merch
                  </button>
                </div>
                <p className="text-gray-400 text-xs mt-2">
                  Available: {totalEarned.toFixed(2)} DYO
                  {dys > 0 && ` + ${dys.toFixed(2)} DYS`}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default StreamEarnDisplay;
