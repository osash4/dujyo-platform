import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, TrendingUp } from 'lucide-react';

interface BalanceUpdateNotificationProps {
  show: boolean;
  newBalance: number;
  previousBalance: number;
  onClose: () => void;
}

export const BalanceUpdateNotification: React.FC<BalanceUpdateNotificationProps> = ({
  show,
  newBalance,
  previousBalance,
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      const timer = setTimeout(() => {
        setIsVisible(false);
        setTimeout(onClose, 300); // Wait for animation to complete
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [show, onClose]);

  const difference = newBalance - previousBalance;
  const isIncrease = difference > 0;

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, y: -50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -50, scale: 0.9 }}
          className="fixed top-4 right-4 z-50 bg-gray-800/95 backdrop-blur-lg border border-gray-600/50 rounded-xl p-4 shadow-2xl max-w-sm"
        >
          <div className="flex items-center gap-3">
            <motion.div
              className={`p-2 rounded-full ${
                isIncrease ? 'bg-green-500/20' : 'bg-red-500/20'
              }`}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 0.5 }}
            >
              {isIncrease ? (
                <TrendingUp className="w-5 h-5 text-green-400" />
              ) : (
                <CheckCircle className="w-5 h-5 text-red-400" />
              )}
            </motion.div>
            
            <div className="flex-1">
              <h4 className="text-white font-semibold text-sm">
                Balance Updated
              </h4>
              <p className="text-gray-300 text-xs">
                {isIncrease ? '+' : ''}{difference.toFixed(2)} DYO
              </p>
              <p className="text-gray-400 text-xs">
                New balance: {newBalance.toFixed(2)} DYO
              </p>
            </div>
            
            <motion.button
              onClick={() => {
                setIsVisible(false);
                setTimeout(onClose, 300);
              }}
              className="text-gray-400 hover:text-white transition-colors"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              ×
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
