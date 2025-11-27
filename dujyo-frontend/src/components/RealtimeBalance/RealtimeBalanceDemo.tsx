import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, Square, RefreshCw, Zap, Coins, TrendingUp } from 'lucide-react';
import { usePlayerContext } from '../../contexts/PlayerContext';
import { useRealtimeBalance } from '../../hooks/useRealtimeBalance';
import { RealtimeBalanceIndicator } from './RealtimeBalanceIndicator';

export const RealtimeBalanceDemo: React.FC = () => {
  const { isPlaying, currentTrack, playTrack, pauseTrack, stopTrack } = usePlayerContext();
  const { 
    balance, 
    dysBalance, 
    totalBalance, 
    isUpdating, 
    isPlayerActive,
    refreshBalance,
    pollingInterval 
  } = useRealtimeBalance({
    activePollingInterval: 2000,   // 2 seconds when playing
    inactivePollingInterval: 10000 // 10 seconds when paused
  });

  const [showDetails, setShowDetails] = useState(false);

  // Demo track for testing
  const demoTrack = {
    id: 'demo-track',
    title: 'Demo Track - Real-time Balance Test',
    artist: 'Dujyo Demo',
    url: '/music/demo.mp3',
    playerMode: 'music' as const,
    cover: 'demo-cover.jpg'
  };

  const handlePlay = () => {
    if (isPlaying) {
      pauseTrack();
    } else {
      playTrack(demoTrack);
    }
  };

  const handleStop = () => {
    stopTrack();
  };

  const handleRefresh = () => {
    refreshBalance();
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">
          🎵 Real-time Balance System Demo
        </h1>
        <p className="text-gray-400">
          Experience live balance updates during music streaming
        </p>
      </div>

      {/* Player Controls */}
      <div className="bg-gray-800 rounded-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={handlePlay}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                isPlaying 
                  ? 'bg-red-600 hover:bg-red-700 text-white' 
                  : 'bg-green-600 hover:bg-green-700 text-white'
              }`}
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} />}
              {isPlaying ? 'Pause' : 'Play'} Demo
            </button>
            
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-all"
            >
              <Square size={16} />
              Stop
            </button>
          </div>

          <div className="flex items-center gap-4">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-all"
            >
              <RefreshCw size={16} className={isUpdating ? 'animate-spin' : ''} />
              Refresh Balance
            </button>
            
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-all"
            >
              <TrendingUp size={16} />
              {showDetails ? 'Hide' : 'Show'} Details
            </button>
          </div>
        </div>

        {/* Track Info */}
        {currentTrack && (
          <div className="bg-gray-700 rounded-lg p-4 mb-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-amber-500 to-orange-500 rounded-lg flex items-center justify-center">
                <Zap size={24} className="text-white" />
              </div>
              <div>
                <h3 className="text-white font-semibold">{currentTrack.title}</h3>
                <p className="text-gray-400 text-sm">{currentTrack.artist}</p>
              </div>
            </div>
          </div>
        )}

        {/* Status Indicators */}
        <div className="flex items-center gap-4 text-sm">
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            isPlayerActive 
              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isPlayerActive ? 'bg-green-400 animate-pulse' : 'bg-gray-400'
            }`}></div>
            {isPlayerActive ? 'Live Streaming' : 'Idle'}
          </div>
          
          <div className={`flex items-center gap-2 px-3 py-1 rounded-full ${
            isUpdating 
              ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' 
              : 'bg-gray-500/20 text-gray-400 border border-gray-500/30'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              isUpdating ? 'bg-blue-400 animate-pulse' : 'bg-gray-400'
            }`}></div>
            {isUpdating ? 'Updating...' : 'Synced'}
          </div>
          
          <div className="text-gray-400">
            Polling: {pollingInterval / 1000}s
          </div>
        </div>
      </div>

      {/* Balance Display */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Compact Balance */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Coins size={20} />
            Compact Balance
          </h3>
          <RealtimeBalanceIndicator 
            compact={true}
            showDYS={true}
            className="w-full"
          />
        </div>

        {/* Detailed Balance */}
        <div className="bg-gray-800 rounded-lg p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <TrendingUp size={20} />
            Detailed Balance
          </h3>
          <RealtimeBalanceIndicator 
            compact={false}
            showDYS={true}
            showSessionEarnings={true}
            className="w-full"
          />
        </div>
      </div>

      {/* Technical Details */}
      {showDetails && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-gray-800 rounded-lg p-6"
        >
          <h3 className="text-white font-semibold mb-4">Technical Details</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Current Balance:</span>
                <span className="text-white">{balance.toFixed(4)} DYO</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">DYS Balance:</span>
                <span className="text-white">{dysBalance.toFixed(4)} DYS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Balance:</span>
                <span className="text-white">{totalBalance.toFixed(4)}</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Player Status:</span>
                <span className={`${isPlayerActive ? 'text-green-400' : 'text-gray-400'}`}>
                  {isPlayerActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Update Status:</span>
                <span className={`${isUpdating ? 'text-blue-400' : 'text-green-400'}`}>
                  {isUpdating ? 'Updating' : 'Synced'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Polling Interval:</span>
                <span className="text-white">{pollingInterval / 1000}s</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Instructions */}
      <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-6">
        <h3 className="text-blue-400 font-semibold mb-2">How it works:</h3>
        <ul className="text-blue-300 text-sm space-y-1">
          <li>• <strong>Play</strong> the demo track to activate real-time balance updates</li>
          <li>• Balance polling increases to <strong>2 seconds</strong> when streaming</li>
          <li>• Balance polling decreases to <strong>10 seconds</strong> when paused</li>
          <li>• <strong>Stream earnings</strong> are calculated and reflected in real-time</li>
          <li>• <strong>Visual indicators</strong> show update status and player activity</li>
        </ul>
      </div>
    </div>
  );
};
