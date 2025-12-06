import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Coins, Zap, TrendingUp } from 'lucide-react';

interface StreamEarnNotificationProps {
  type: 'artist' | 'listener';
  amount: number;
  currency: string;
  isVisible: boolean;
  onClose: () => void;
}

const StreamEarnNotification: React.FC<StreamEarnNotificationProps> = ({
  type,
  amount,
  currency,
  isVisible,
  onClose
}) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(() => {
        onClose();
      }, 4000); // Auto-close after 4 seconds

      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const getIcon = () => {
    switch (type) {
      case 'artist':
        return <TrendingUp className="w-6 h-6 text-yellow-400" />;
      case 'listener':
        return <Zap className="w-6 h-6 text-blue-400" />;
      default:
        return <Coins className="w-6 h-6 text-green-400" />;
    }
  };

  const getColor = () => {
    switch (type) {
      case 'artist':
        return 'from-yellow-500/20 to-orange-500/20 border-yellow-400/30';
      case 'listener':
        return 'from-orange-500/20 to-orange-500/20 border-blue-400/30';
      default:
        return 'from-green-500/20 to-emerald-500/20 border-green-400/30';
    }
  };

  const getTextColor = () => {
    switch (type) {
      case 'artist':
        return 'text-yellow-400';
      case 'listener':
        return 'text-blue-400';
      default:
        return 'text-green-400';
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: 100, scale: 0.8 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 100, scale: 0.8 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className={`fixed bottom-20 right-4 z-50 bg-gradient-to-r ${getColor()} backdrop-blur-lg rounded-xl p-4 border shadow-2xl max-w-sm`}
        >
          <div className="flex items-center gap-3">
            <motion.div
              animate={{ 
                rotate: [0, 10, -10, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ 
                duration: 0.6,
                repeat: Infinity,
                repeatDelay: 2
              }}
            >
              {getIcon()}
            </motion.div>
            
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className={`font-bold ${getTextColor()}`}>
                  {type === 'artist' ? 'Artist Earned!' : 'Listener Earned!'}
                </h3>
                <motion.div
                  animate={{ 
                    scale: [1, 1.2, 1],
                    opacity: [0.7, 1, 0.7]
                  }}
                  transition={{ 
                    duration: 1,
                    repeat: Infinity
                  }}
                >
                  <Coins className="w-4 h-4 text-yellow-400" />
                </motion.div>
              </div>
              
              <p className="text-white text-sm">
                +{amount} {currency} for streaming
              </p>
              
              <div className="flex items-center gap-1 mt-1">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-xs text-gray-300">Stream-to-Earn Active</span>
              </div>
            </div>
          </div>
          
          {/* Progress bar */}
          <motion.div
            className="mt-3 h-1 bg-gray-700 rounded-full overflow-hidden"
            initial={{ width: "100%" }}
            animate={{ width: "0%" }}
            transition={{ duration: 4, ease: "linear" }}
          >
            <div className={`h-full bg-gradient-to-r ${getColor().replace('/20', '/60')}`} />
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default StreamEarnNotification;
