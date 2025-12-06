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
import { useS2EConfig } from '../../hooks/useS2EConfig';
import { useS2ELimits } from '../../hooks/useS2ELimits';

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
  const { config, loading: configLoading } = useS2EConfig();
  const { limits, loading: limitsLoading } = useS2ELimits();
  
  const userRole = getUserRole();
  
  // ✅ Usar balance REAL del blockchain en lugar de valores locales acumulados
  const { available_dyo, dys, isUpdating: isBalanceUpdating } = useUnifiedBalance();
  const totalEarned = available_dyo; // Balance real del blockchain

  // 🆕 1. Ganancia acumulada en sesión
  const [sessionEarnings, setSessionEarnings] = useState(0);
  const [sessionStartTime, setSessionStartTime] = useState<number | null>(null);
  const [lastTrackId, setLastTrackId] = useState<string | null>(null);
  const [lastPauseTime, setLastPauseTime] = useState<number | null>(null);

  // 🆕 2. Tiempo de sesión actual
  const [sessionTime, setSessionTime] = useState(0);

  // 🆕 Resetear sesión cuando cambia de track o pausa > 5 min
  useEffect(() => {
    if (!currentTrack) {
      setSessionEarnings(0);
      setSessionTime(0);
      setSessionStartTime(null);
      setLastTrackId(null);
      return;
    }

    const currentTrackId = currentTrack.id;
    const now = Date.now();

    // Si cambió de track, resetear sesión
    if (lastTrackId !== null && lastTrackId !== currentTrackId) {
      setSessionEarnings(0);
      setSessionTime(0);
      setSessionStartTime(now);
      setLastTrackId(currentTrackId);
    } else if (lastTrackId === null) {
      // Primera vez que se reproduce este track
      setSessionStartTime(now);
      setLastTrackId(currentTrackId);
    }

    // Si pausó por más de 5 minutos, resetear sesión
    if (!isPlaying && lastPauseTime === null) {
      setLastPauseTime(now);
    } else if (isPlaying && lastPauseTime !== null) {
      const pauseDuration = now - lastPauseTime;
      if (pauseDuration > 5 * 60 * 1000) { // 5 minutos
        setSessionEarnings(0);
        setSessionTime(0);
        setSessionStartTime(now);
      }
      setLastPauseTime(null);
    }
  }, [currentTrack, isPlaying, lastTrackId, lastPauseTime]);

  // 🆕 Contador de tiempo de sesión
  useEffect(() => {
    if (!isPlaying || !sessionStartTime) {
      return;
    }

    const interval = setInterval(() => {
      const elapsed = Math.floor((Date.now() - sessionStartTime) / 1000);
      setSessionTime(elapsed);
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, sessionStartTime]);

  // Listen for real-time earnings updates from backend
  useEffect(() => {
    const handleEarningsUpdate = (event: CustomEvent) => {
      const { earned } = event.detail || {};
      if (earned > 0) {
        // 🆕 Acumular ganancia en sesión
        setSessionEarnings(prev => prev + earned);

        // 🆕 Notificación mejorada con nombre del track
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
  }, [streamEarnData.artistTokens, streamEarnData.listenerTokens, currentTrack]);

  // 🆕 Notificaciones de límite mejoradas (80%, 95%, 100%)
  useEffect(() => {
    if (!limits || limitsLoading) return;

    const progress = getDailyProgress();
    const limitInfo = getDailyLimitInfo();
    
    let notificationType: 'warning' | 'critical' | 'limit-reached' | null = null;
    let message = '';

    if (progress >= 100) {
      notificationType = 'limit-reached';
      message = `Daily limit reached: ${limitInfo.used}/${limitInfo.limit} min`;
    } else if (progress >= 95) {
      notificationType = 'critical';
      message = `Critical: ${limitInfo.used}/${limitInfo.limit} min used`;
    } else if (progress >= 80) {
      notificationType = 'warning';
      message = `Warning: ${limitInfo.used}/${limitInfo.limit} min used`;
    }

    if (notificationType) {
      // Solo mostrar una vez por nivel
      const hasShown = notifications.some(n => 
        n.id.startsWith(`limit-${notificationType}`)
      );
      
      if (!hasShown) {
        const limitNotification: EarnNotification = {
          id: `limit-${notificationType}-${Date.now()}`,
          type: 'listener',
          amount: 0, // Special notification
          timestamp: Date.now()
        };
        setNotifications(prev => [limitNotification, ...prev.slice(0, 4)]);
        
        // Play sound for critical/limit-reached
        if (notificationType === 'critical' || notificationType === 'limit-reached') {
          try {
            const audio = new Audio('/sounds/alert.mp3'); // You'll need to add this sound file
            audio.volume = 0.3;
            audio.play().catch(() => {}); // Ignore errors if file doesn't exist
          } catch (e) {
            // Sound file not available, continue silently
          }
        }
      }
    }
  }, [limits, limitsLoading, streamEarnData.dailyEarned, streamEarnData.dailyLimit]);

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
    // Use real limits if available, otherwise fallback to streamEarnData
    if (limits && !limitsLoading) {
      const progress = (limits.daily_limits.session_minutes.used / limits.daily_limits.session_minutes.limit) * 100;
      return progress;
    }
    return (streamEarnData.dailyEarned / streamEarnData.dailyLimit) * 100;
  };

  const getProgressColor = () => {
    const progress = getDailyProgress();
    if (progress < 80) return 'from-green-500 to-emerald-500';
    if (progress < 95) return 'from-yellow-500 to-orange-500';
    return 'from-red-500 to-rose-500';
  };

  const getDailyLimitInfo = () => {
    if (limits && !limitsLoading) {
      return {
        used: limits.daily_limits.session_minutes.used,
        limit: limits.daily_limits.session_minutes.limit,
        remaining: limits.daily_limits.session_minutes.remaining,
      };
    }
    return {
      used: Math.round(streamEarnData.dailyEarned),
      limit: streamEarnData.dailyLimit,
      remaining: Math.max(0, streamEarnData.dailyLimit - Math.round(streamEarnData.dailyEarned)),
    };
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
        } hover:from-yellow-600 hover:to-orange-600 text-white p-4 rounded-xl shadow-lg transition-all duration-300 flex flex-col gap-1 min-w-[200px]`}
      >
        <div className="flex items-center gap-3 w-full">
          <Coins size={20} className={isBalanceUpdating ? 'animate-pulse' : ''} />
          <span className="font-bold">{totalEarned.toFixed(2)} DYO</span>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Zap size={16} />
          </motion.div>
        </div>
        {/* 🆕 Ganancia acumulada en sesión */}
        {sessionEarnings > 0 && (
          <div className="text-xs text-yellow-200 flex items-center gap-1 w-full justify-center">
            <span>+{sessionEarnings.toFixed(2)} DYO</span>
            <span className="text-gray-300">•</span>
            <span>Session: {formatTime(sessionTime)}</span>
          </div>
        )}
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
                <p className={`font-semibold ${
                  notification.amount > 0 
                    ? 'text-white' 
                    : notification.id.includes('limit-reached')
                    ? 'text-red-400'
                    : notification.id.includes('critical')
                    ? 'text-orange-400'
                    : 'text-yellow-400'
                }`}>
                  {notification.amount > 0 
                    ? `+${notification.amount.toFixed(2)} DYO` 
                    : notification.id.includes('limit-reached')
                    ? '🚨 Daily limit reached!'
                    : notification.id.includes('critical')
                    ? '⚠️ Critical: 95% limit reached'
                    : '⚠️ Warning: 80% limit reached'}
                </p>
                <p className="text-gray-400 text-sm">
                  {notification.amount > 0 ? (
                    <>
                      {notification.type === 'artist' ? 'Artist Reward' : 'Listener Reward'}
                      {currentTrack && ` from ${currentTrack.title}`}
                    </>
                  ) : (
                    `${getDailyLimitInfo().used}/${getDailyLimitInfo().limit} min used today`
                  )}
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

            {/* 🆕 Session Earnings */}
            {sessionEarnings > 0 && (
              <div className="mb-4 p-3 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg border border-yellow-500/30">
                <div className="flex items-center justify-between">
                  <span className="text-gray-300 text-sm">Session Earnings</span>
                  <span className="text-yellow-400 font-bold">+{sessionEarnings.toFixed(2)} DYO</span>
                </div>
              </div>
            )}

            {/* Daily Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-400">Daily Progress</span>
                <span className={`font-semibold ${
                  getDailyProgress() < 80 ? 'text-green-400' :
                  getDailyProgress() < 95 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {getDailyLimitInfo().used}/{getDailyLimitInfo().limit} min
                </span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-2">
                <div 
                  className={`bg-gradient-to-r ${getProgressColor()} h-2 rounded-full transition-all duration-300`}
                  style={{ width: `${Math.min(getDailyProgress(), 100)}%` }}
                />
              </div>
              {limits && limits.cooldown_active && limits.cooldown_ends_at && (
                <div className="text-xs text-yellow-400 flex items-center gap-1">
                  <Clock size={12} />
                  Cooldown active until {new Date(limits.cooldown_ends_at).toLocaleTimeString()}
                </div>
              )}
            </div>

            {/* Stream Time */}
            <div className="mt-4 pt-4 border-t border-gray-700 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-gray-400">Session Time</span>
                </div>
                <span className="text-white font-medium">
                  {formatTime(sessionTime)}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Clock size={14} className="text-gray-400" />
                  <span className="text-gray-400">Total Stream Time</span>
                </div>
                <span className="text-white font-medium">
                  {formatTime(streamEarnData.totalStreamTime)}
                </span>
              </div>
            </div>

            {/* Earning Rate Info */}
            <div className="mt-3 p-3 bg-gray-700/30 rounded-lg space-y-2">
              <p className="text-gray-400 text-xs">
                💡 <strong>Earning Rates:</strong><br/>
                {configLoading ? (
                  <span className="text-gray-500">Loading rates...</span>
                ) : config ? (
                  <>
                    • Listeners: <span className="text-blue-400 font-semibold">{config.listenerRate} DYO/min</span> (max {config.dailyLimitListener} min/day)<br/>
                    • Artists: <span className="text-amber-400 font-semibold">{config.artistRate} DYO/min</span> per fan (max {config.dailyLimitArtist} min/day)<br/>
                    ⚠️ Artists earn DYO when <strong>fans</strong> listen to their content. Listening to your own content does not generate DYO.
                  </>
                ) : (
                  <>
                    • Listeners: 0.3 DYO/min (max 90 min/day)<br/>
                    • Artists: 1.5 DYO/min per fan (max 120 min/day)
                  </>
                )}
              </p>
              {config && !configLoading && config.poolRemaining !== undefined && config.poolTotal !== undefined && (
                <div className="mt-2 pt-2 border-t border-gray-600">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-gray-400 text-xs">Monthly Pool:</span>
                    <span className="text-gray-300 text-xs">
                      {Math.round(config.poolRemaining || 0).toLocaleString()} / {Math.round(config.poolTotal || 0).toLocaleString()} DYO
                    </span>
                  </div>
                  <div className="w-full bg-gray-600 rounded-full h-1.5">
                    <div 
                      className="bg-blue-500 h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.min(((config.poolRemaining || 0) / (config.poolTotal || 1)) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-gray-500 text-xs mt-1">
                    {config.poolMonth} • {((config.poolRemaining / config.poolTotal) * 100).toFixed(1)}% remaining
                  </div>
                </div>
              )}
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
                      // Navigate to Marketplace (NFT section lives there)
                      window.location.href = '/marketplace';
                    }}
                    className="flex items-center gap-2 px-3 py-2 bg-purple-500/20 border border-purple-500/50 text-purple-400 rounded-lg hover:bg-purple-500/30 transition-colors text-sm"
                  >
                    <Image size={14} />
                    Buy NFTs
                  </button>
                  <button
                    onClick={() => {
                      // Navigate to merch coming soon
                      window.location.href = '/merch';
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
