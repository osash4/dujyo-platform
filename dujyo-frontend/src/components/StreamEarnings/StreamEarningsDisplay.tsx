import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Coins, 
  Play, 
  Pause, 
  TrendingUp, 
  Music,
  Zap,
  X
} from 'lucide-react';
import { usePlayerContext } from '../../contexts/PlayerContext';
import { useAuth } from '../../auth/AuthContext';
import { useRealtimeBalance } from '../../hooks/useRealtimeBalance';

interface EarningsNotification {
  id: string;
  type: 'artist' | 'listener';
  amount: number;
  timestamp: number;
}

const StreamEarningsDisplay: React.FC = () => {
  const { currentTrack, isPlaying, streamEarnData } = usePlayerContext();
  const { getUserRole } = useAuth();
  
  console.log("🔍 [DEBUG] StreamEarningsDisplay - Context State:", {
    currentTrack: currentTrack ? currentTrack.title : "NULL", 
    isPlaying,
    componentRendering: !!(currentTrack && isPlaying),
    source: 'StreamEarningsDisplay',
    timestamp: Date.now()
  });
  
  // ✅ HOOK SIEMPRE ACTIVO - mover arriba de cualquier condición
  const { 
    balance: realtimeBalance, 
    dysBalance, 
    totalBalance, 
    isUpdating: isBalanceUpdating,
    isPlayerActive,
    refreshBalance  // ← AGREGAR para sync manual
  } = useRealtimeBalance({
    activePollingInterval: 2000,   // 2s cuando playing
    inactivePollingInterval: 10000 // 10s cuando paused
  });

  // ✅ DEBUG EN COMPONENTE PADRE - DESPUÉS del hook
  console.log("🎵 DEBUG StreamEarningsDisplay State:", {
    currentTrack: currentTrack ? `${currentTrack.title} (${currentTrack.id})` : 'null', 
    isPlaying,
    componentRendering: !!(currentTrack && isPlaying),
    timestamp: new Date().toISOString()
  });

  // Use the realtime balance data in the component
  console.log('Realtime balance data:', { realtimeBalance, dysBalance, totalBalance, isBalanceUpdating, isPlayerActive });

  const [notifications, setNotifications] = useState<EarningsNotification[]>([]);
  const [showPanel, setShowPanel] = useState(false);

  const userRole = getUserRole();

  // ✅ DEBUG EFFECT - Track component state changes
  useEffect(() => {
    console.log("🔄 StreamEarningsDisplay - State Change Detected:", {
      currentTrack: currentTrack ? `${currentTrack.title} (${currentTrack.id})` : 'null',
      isPlaying,
      componentRendering: !!(currentTrack && isPlaying),
      timestamp: new Date().toISOString()
    });
  }, [currentTrack, isPlaying]);

  // Listen for real-time earnings updates
  useEffect(() => {
    const handleEarningsUpdate = (event: CustomEvent) => {
      const { earned } = event.detail || {};
      if (earned > 0) {
        const newNotification: EarningsNotification = {
          id: Date.now().toString(),
          type: userRole === 'artist' ? 'artist' : 'listener',
          amount: earned,
          timestamp: Date.now()
        };

        setNotifications(prev => [newNotification, ...prev.slice(0, 4)]); // Keep last 5

        // Auto-remove notification after 3 seconds
        setTimeout(() => {
          setNotifications(prev => prev.filter(n => n.id !== newNotification.id));
        }, 3000);
      }
    };

    window.addEventListener('dujyo:balance-updated', handleEarningsUpdate as EventListener);
    return () => window.removeEventListener('dujyo:balance-updated', handleEarningsUpdate as EventListener);
  }, [userRole]);

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const getTotalEarnings = () => {
    return userRole === 'artist' ? streamEarnData.artistTokens : streamEarnData.listenerTokens;
  };

  const getEarningsRate = () => {
    // ✅ FIXED RATES: 0.10 DYO/min (listener), 0.50 DYO/min (artist)
    return userRole === 'artist' ? '0.50 DYO/min' : '0.10 DYO/min';
  };

  const getDailyProgress = () => {
    return (streamEarnData.dailyEarned / streamEarnData.dailyLimit) * 100;
  };

  if (!currentTrack || !isPlaying) {
    return null;
  }

  return (
    <>
      {/* Floating Earnings Button */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setShowPanel(!showPanel)}
        className="fixed bottom-20 left-4 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white p-4 rounded-xl shadow-lg transition-all duration-300 flex items-center gap-3 min-w-[200px]"
      >
        <Coins size={20} />
        <span className="font-semibold">{getTotalEarnings()} DYO</span>
        <TrendingUp size={16} />
      </motion.button>

      {/* Earnings Panel */}
      <AnimatePresence>
        {showPanel && (
          <motion.div
            initial={{ opacity: 0, x: -300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -300 }}
            className="fixed bottom-20 left-4 z-50 bg-gray-800 border border-gray-700 rounded-xl p-6 w-96 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Zap size={20} className="text-yellow-400" />
                Stream Earnings
              </h3>
              <button
                onClick={() => setShowPanel(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Current Track Info */}
            <div className="bg-gray-700/50 rounded-lg p-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                  <Music size={20} className="text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{currentTrack.title}</p>
                  <p className="text-gray-400 text-sm truncate">{currentTrack.artist}</p>
                </div>
                <div className="flex items-center gap-1">
                  {isPlaying ? (
                    <Play size={16} className="text-green-400" />
                  ) : (
                    <Pause size={16} className="text-yellow-400" />
                  )}
                </div>
              </div>
            </div>

            {/* Earnings Stats */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Total Earned</span>
                <span className="text-yellow-400 font-semibold text-lg">
                  {getTotalEarnings()} DYO
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Earning Rate</span>
                <span className="text-green-400 font-medium">
                  {getEarningsRate()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-gray-400">Stream Time</span>
                <span className="text-blue-400 font-medium">
                  {formatTime(streamEarnData.totalStreamTime)}
                </span>
              </div>

              {/* Real-time Balance Display */}
              <div className="pt-3 border-t border-gray-700">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-400">Live Balance</span>
                  <div className="flex items-center gap-2">
                    {isBalanceUpdating && (
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                    )}
                    <button
                      onClick={refreshBalance}
                      className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                      disabled={isBalanceUpdating}
                    >
                      {isBalanceUpdating ? 'Updating...' : 'Refresh'}
                    </button>
                    <span className="text-xs text-gray-500">
                      {isPlayerActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">DYO</span>
                    <span className="text-white font-medium">
                      {realtimeBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400 text-sm">DYS</span>
                    <span className="text-white font-medium">
                      {dysBalance.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-gray-600">
                    <span className="text-gray-400 text-sm font-medium">Total</span>
                    <span className="text-yellow-400 font-semibold">
                      {totalBalance.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Daily Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-gray-400">Daily Progress</span>
                  <span className="text-gray-400 text-sm">
                    {streamEarnData.dailyEarned.toFixed(1)} / {streamEarnData.dailyLimit} min
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-green-500 to-orange-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(getDailyProgress(), 100)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Recent Notifications */}
            {notifications.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-700">
                <h4 className="text-sm font-medium text-gray-400 mb-2">Recent Earnings</h4>
                <div className="space-y-2">
                  {notifications.slice(0, 3).map((notification) => (
                    <motion.div
                      key={notification.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="flex items-center justify-between bg-gray-700/30 rounded-lg p-2"
                    >
                      <div className="flex items-center gap-2">
                        <Coins size={14} className="text-yellow-400" />
                        <span className="text-white text-sm">
                          {notification.type === 'artist' ? 'Artist' : 'Listener'} earned
                        </span>
                      </div>
                      <span className="text-green-400 font-semibold text-sm">
                        +{notification.amount} DYO
                      </span>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}

            {/* Role Info */}
            <div className="mt-4 pt-4 border-t border-gray-700">
              <div className="flex items-center gap-2 text-sm">
                <div className={`w-2 h-2 rounded-full ${
                  userRole === 'artist' ? 'bg-pink-400' : 'bg-blue-400'
                }`} />
                <span className="text-gray-400">
                  {userRole === 'artist' 
                    ? 'Earning as Artist (0.50 DYO/min, max 120min/day)' 
                    : 'Earning as Listener (0.10 DYO/min, max 120min/day)'
                  }
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Live Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        <AnimatePresence>
          {notifications.map((notification) => (
            <motion.div
              key={notification.id}
              initial={{ opacity: 0, x: 300, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 300, scale: 0.8 }}
              className="bg-gradient-to-r from-green-500 to-orange-500 text-white p-3 rounded-lg shadow-lg flex items-center gap-3 min-w-64"
            >
              <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                <Coins size={16} />
              </div>
              <div className="flex-1">
                <p className="font-semibold text-sm">
                  +{notification.amount} DYO Earned!
                </p>
                <p className="text-xs opacity-90">
                  {notification.type === 'artist' ? 'Artist reward' : 'Listener reward'}
                </p>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </>
  );
};

export default StreamEarningsDisplay;
