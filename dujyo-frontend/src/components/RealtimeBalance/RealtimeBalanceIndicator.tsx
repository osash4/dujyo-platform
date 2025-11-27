import React from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, Zap } from 'lucide-react';
import { useRealtimeBalance } from '../../hooks/useRealtimeBalance';

interface RealtimeBalanceIndicatorProps {
  showDYS?: boolean;
  showSessionEarnings?: boolean;
  compact?: boolean;
  className?: string;
}

export const RealtimeBalanceIndicator: React.FC<RealtimeBalanceIndicatorProps> = ({
  showDYS = true,
  showSessionEarnings = true,
  compact = false,
  className = ''
}) => {
  const { 
    balance, 
    dysBalance, 
    totalBalance, 
    isUpdating, 
    isPlayerActive,
    lastUpdate 
  } = useRealtimeBalance({
    activePollingInterval: 3000,
    inactivePollingInterval: 15000
  });

  const formatBalance = (amount: number) => {
    return amount.toFixed(2);
  };

  const getUpdateStatus = () => {
    if (isUpdating) return 'updating';
    if (isPlayerActive) return 'active';
    return 'idle';
  };

  const status = getUpdateStatus();

  if (compact) {
    return (
      <motion.div
        className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-all duration-300 ${className}`}
        animate={{
          backgroundColor: status === 'updating' ? 'rgba(59, 130, 246, 0.1)' : 
                          status === 'active' ? 'rgba(34, 197, 94, 0.1)' : 'rgba(107, 114, 128, 0.1)',
          borderColor: status === 'updating' ? 'rgba(59, 130, 246, 0.3)' : 
                      status === 'active' ? 'rgba(34, 197, 94, 0.3)' : 'rgba(107, 114, 128, 0.3)'
        }}
      >
        <Coins 
          size={14} 
          className={`${
            status === 'updating' ? 'text-blue-400 animate-pulse' : 
            status === 'active' ? 'text-green-400' : 'text-gray-400'
          }`} 
        />
        <span className={`text-sm font-semibold ${
          status === 'updating' ? 'text-blue-400' : 
          status === 'active' ? 'text-green-400' : 'text-gray-400'
        }`}>
          {formatBalance(balance)} DYO
        </span>
        {isUpdating && (
          <motion.div
            className="w-2 h-2 bg-blue-400 rounded-full"
            animate={{ scale: [1, 1.2, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </motion.div>
    );
  }

  return (
    <motion.div
      className={`flex flex-col gap-2 p-4 rounded-lg border transition-all duration-300 ${className}`}
      animate={{
        backgroundColor: status === 'updating' ? 'rgba(59, 130, 246, 0.05)' : 
                        status === 'active' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(107, 114, 128, 0.05)',
        borderColor: status === 'updating' ? 'rgba(59, 130, 246, 0.2)' : 
                    status === 'active' ? 'rgba(34, 197, 94, 0.2)' : 'rgba(107, 114, 128, 0.2)'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Coins 
            size={16} 
            className={`${
              status === 'updating' ? 'text-blue-400 animate-pulse' : 
              status === 'active' ? 'text-green-400' : 'text-gray-400'
            }`} 
          />
          <span className={`font-semibold ${
            status === 'updating' ? 'text-blue-400' : 
            status === 'active' ? 'text-green-400' : 'text-gray-400'
          }`}>
            Balance
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          {isPlayerActive && (
            <motion.div
              className="flex items-center gap-1 text-green-400"
              animate={{ opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Zap size={12} />
              <span className="text-xs">LIVE</span>
            </motion.div>
          )}
          
          {isUpdating && (
            <motion.div
              className="w-2 h-2 bg-blue-400 rounded-full"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
          )}
        </div>
      </div>

      {/* Balance Display */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-500">DYO</span>
          <motion.span
            key={balance}
            className="text-lg font-bold text-white"
            initial={{ scale: 1.1, opacity: 0.7 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {formatBalance(balance)}
          </motion.span>
        </div>

        {showDYS && (
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">DYS</span>
            <motion.span
              key={dysBalance}
              className="text-lg font-bold text-blue-400"
              initial={{ scale: 1.1, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {formatBalance(dysBalance)}
            </motion.span>
          </div>
        )}

        <div className="border-t border-gray-700 pt-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-500">Total</span>
            <motion.span
              key={totalBalance}
              className="text-lg font-bold text-green-400"
              initial={{ scale: 1.1, opacity: 0.7 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              {formatBalance(totalBalance)}
            </motion.span>
          </div>
        </div>
      </div>

      {/* Status Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          {status === 'updating' ? 'Updating...' : 
           status === 'active' ? 'Live streaming' : 'Idle'}
        </span>
        <span>
          {lastUpdate > 0 && `Updated ${Math.floor((Date.now() - lastUpdate) / 1000)}s ago`}
        </span>
      </div>
    </motion.div>
  );
};
