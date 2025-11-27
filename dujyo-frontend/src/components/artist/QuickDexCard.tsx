import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Repeat, Zap, ArrowDownRight } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useUnifiedBalance } from '../../hooks/useUnifiedBalance';

interface QuickDexCardProps {
  currentBalance: number;
  onSwapSuccess?: () => void;
}

const QuickDexCard: React.FC<QuickDexCardProps> = ({ 
  onSwapSuccess 
}) => {
  const { user } = useAuth();
  const { available_dyo, dys, refreshBalance } = useUnifiedBalance();
  const [swapAmount, setSwapAmount] = useState('');
  const [swapping, setSwapping] = useState(false);
  const [swapMessage, setSwapMessage] = useState('');
  const [swapDirection, setSwapDirection] = useState<'DYO_TO_DYS' | 'DYS_TO_DYO'>('DYO_TO_DYS');

  const handleQuickSwap = async () => {
    if (!user) {
      setSwapMessage('Please connect your wallet first');
      return;
    }

    if (!swapAmount || parseFloat(swapAmount) <= 0) {
      setSwapMessage('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(swapAmount);
    
    // Validar balance
    if (swapDirection === 'DYO_TO_DYS' && amount > available_dyo) {
      setSwapMessage(`Insufficient DYO balance. Available: ${available_dyo.toFixed(2)} DYO`);
      return;
    }
    
    if (swapDirection === 'DYS_TO_DYO' && amount > dys) {
      setSwapMessage(`Insufficient DYS balance. Available: ${dys.toFixed(2)} DYS`);
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000);

    setSwapping(true);
    setSwapMessage('');

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const fromToken = swapDirection === 'DYO_TO_DYS' ? 'DYO' : 'DYS';
      const toToken = swapDirection === 'DYO_TO_DYS' ? 'DYS' : 'DYO';
      
      // Calculate min received (2% slippage)
      const expectedAmount = amount; // 1:1 ratio for now
      const minReceived = expectedAmount * 0.98;

      const swapRequest = {
        from: fromToken,
        to: toToken,
        amount: amount,
        min_received: minReceived,
        user: user.uid
      };

      const response = await fetch('http://localhost:8083/swap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(swapRequest),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success) {
        setSwapMessage(`Swap successful! Received ${result.amount_received || amount.toFixed(2)} ${toToken}`);
        setSwapAmount('');
        
        // Actualizar balances
        await refreshBalance();
        
        // Notificar al dashboard para refrescar métricas
        if (onSwapSuccess) {
          setTimeout(() => onSwapSuccess(), 1000);
        }
      } else {
        setSwapMessage(`Swap failed: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Quick swap error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setSwapMessage('Request timed out. Please try again.');
      } else {
        setSwapMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setSwapping(false);
      setTimeout(() => setSwapMessage(''), 5000);
    }
  };

  const handleSwapDirection = () => {
    setSwapDirection(prev => prev === 'DYO_TO_DYS' ? 'DYS_TO_DYO' : 'DYO_TO_DYS');
    setSwapAmount('');
    setSwapMessage('');
  };

  const getMaxAmount = () => {
    if (swapDirection === 'DYO_TO_DYS') {
      return available_dyo;
    } else {
      return dys;
    }
  };

  const getFromToken = () => swapDirection === 'DYO_TO_DYS' ? 'DYO' : 'DYS';
  const getToToken = () => swapDirection === 'DYO_TO_DYS' ? 'DYS' : 'DYO';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.55 }}
      className="bg-gradient-to-r from-amber-600 to-orange-600 p-6 rounded-xl shadow-lg"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <h3 className="text-xl font-bold text-white">Quick Swap</h3>
            <motion.button
              onClick={handleSwapDirection}
              className="p-1.5 bg-pink-500/50 rounded-lg hover:bg-pink-500/70 transition-colors"
              whileHover={{ rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              <Repeat className="w-4 h-4 text-white" />
            </motion.button>
          </div>
          <p className="text-pink-100 text-sm mb-4">
            Convert your earnings instantly
          </p>
          
          {/* Swap Interface */}
          <div className="space-y-3">
            {/* From Token */}
            <div className="bg-pink-500/30 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <label className="text-pink-100 text-sm font-medium">From</label>
                <span className="text-pink-200 text-xs">
                  Balance: {swapDirection === 'DYO_TO_DYS' 
                    ? `${available_dyo.toFixed(2)} DYO` 
                    : `${dys.toFixed(2)} DYS`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={swapAmount}
                  onChange={(e) => setSwapAmount(e.target.value)}
                  placeholder="0.0"
                  className="flex-1 bg-pink-500/50 text-white placeholder-pink-200 px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-300"
                  disabled={swapping}
                />
                <button
                  onClick={() => setSwapAmount(getMaxAmount().toString())}
                  className="px-3 py-2 bg-pink-500/50 text-white text-sm rounded-lg hover:bg-pink-500/70 transition-colors"
                  disabled={swapping}
                >
                  Max
                </button>
                <div className="px-3 py-2 bg-pink-500/50 text-white font-semibold rounded-lg min-w-[80px] text-center">
                  {getFromToken()}
                </div>
              </div>
            </div>

            {/* Arrow */}
            <div className="flex justify-center">
              <ArrowDownRight className="w-5 h-5 text-pink-200" />
            </div>

            {/* To Token */}
            <div className="bg-pink-500/30 rounded-lg p-3">
              <div className="flex justify-between items-center mb-2">
                <label className="text-pink-100 text-sm font-medium">To</label>
                <span className="text-pink-200 text-xs">
                  You'll receive: {swapAmount && !isNaN(parseFloat(swapAmount))
                    ? `${(parseFloat(swapAmount) * 0.98).toFixed(2)} ${getToToken()}`
                    : `0.0 ${getToToken()}`}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-pink-500/50 text-white px-3 py-2 rounded-lg text-gray-300">
                  {swapAmount && !isNaN(parseFloat(swapAmount))
                    ? (parseFloat(swapAmount) * 0.98).toFixed(2)
                    : '0.0'}
                </div>
                <div className="px-3 py-2 bg-pink-500/50 text-white font-semibold rounded-lg min-w-[80px] text-center">
                  {getToToken()}
                </div>
              </div>
            </div>
            
            {/* Swap Button */}
            <motion.button
              onClick={handleQuickSwap}
              disabled={swapping || !swapAmount || parseFloat(swapAmount) <= 0}
              className="w-full bg-white text-pink-600 py-3 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-pink-50 transition-colors flex items-center justify-center gap-2"
              whileHover={{ scale: swapping ? 1 : 1.02 }}
              whileTap={{ scale: swapping ? 1 : 0.98 }}
            >
              {swapping ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  >
                    <Zap className="w-4 h-4" />
                  </motion.div>
                  Swapping...
                </>
              ) : (
                <>
                  <Repeat className="w-4 h-4" />
                  Swap to {getToToken()}
                </>
              )}
            </motion.button>

            {/* Message */}
            {swapMessage && (
              <motion.div
                className={`p-2 rounded-lg text-sm text-center ${
                  swapMessage.includes('successful') || swapMessage.includes('Success')
                    ? 'bg-green-500/20 text-green-200 border border-green-500/50'
                    : 'bg-red-500/20 text-red-200 border border-red-500/50'
                }`}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {swapMessage}
              </motion.div>
            )}
          </div>
        </div>
        
        <div className="text-right ml-4">
          <TrendingUp className="w-16 h-16 text-pink-200 mb-2" />
          <p className="text-pink-100 text-sm">Instant conversion</p>
          <p className="text-pink-200 text-xs mt-1">1:1 ratio</p>
        </div>
      </div>
    </motion.div>
  );
};

export default QuickDexCard;

