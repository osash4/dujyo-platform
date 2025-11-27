import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Minus, Droplets, Info, TrendingUp, BarChart3 } from 'lucide-react';

const LiquidityInput: React.FC<{ 
  label: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  token: string; 
  balance: string;
  color: string;
}> = ({ label, value, onChange, token, balance, color }) => (
  <motion.div 
    className="bg-gray-800/30 backdrop-blur-lg rounded-xl p-4 mb-4 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-300"
    whileHover={{ scale: 1.01 }}
  >
    <div className="flex justify-between items-center mb-2">
      <label className="text-gray-300 text-sm font-medium">{label}</label>
      <span className="text-gray-400 text-xs">Balance: {balance} {token}</span>
    </div>
    <div className="flex items-center">
      <input
        type="number"
        className="flex-grow bg-transparent text-white text-2xl font-bold outline-none placeholder-gray-500"
        placeholder="0.0"
        value={value}
        onChange={onChange}
      />
      <motion.div 
        className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2"
        whileHover={{ scale: 1.02 }}
      >
        <div 
          className="w-8 h-8 rounded-full flex items-center justify-center"
          style={{ 
            background: `linear-gradient(135deg, ${color}, ${color}80)`,
            boxShadow: `0 0 10px ${color}50`
          }}
        >
          <span className="text-white font-bold text-xs">{token.substring(0, 2).toUpperCase()}</span>
        </div>
        <span className="text-white font-semibold">{token}</span>
      </motion.div>
    </div>
  </motion.div>
);

// Liquidity Position Card
const LiquidityPosition: React.FC<{
  pair: string;
  share: number;
  value: string;
  apy: number;
  onRemove: () => void;
}> = ({ pair, share, value, apy, onRemove }) => (
  <motion.div
    className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-pink-400/30 hover:border-pink-400/50 transition-all duration-300"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    whileHover={{ scale: 1.02 }}
    style={{
      boxShadow: '0 0 20px rgba(245, 158, 11, 0.1)'
    }}
  >
    <div className="flex items-center justify-between mb-3">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-gradient-to-r from-orange-400 to-purple-500 rounded-full flex items-center justify-center">
          <Droplets size={20} className="text-white" />
        </div>
        <div>
          <h3 className="text-white font-semibold">{pair}</h3>
          <p className="text-gray-400 text-sm">Liquidity Pool</p>
        </div>
      </div>
      <motion.button
        onClick={onRemove}
        className="text-red-400 hover:text-red-300 transition-colors"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Minus size={20} />
      </motion.button>
    </div>
    
    <div className="grid grid-cols-2 gap-4 mb-3">
      <div>
        <p className="text-gray-400 text-sm">Your Share</p>
        <p className="text-orange-400 font-bold">{share}%</p>
      </div>
      <div>
        <p className="text-gray-400 text-sm">Pool Value</p>
        <p className="text-white font-semibold">{value}</p>
      </div>
    </div>
    
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <TrendingUp size={16} className="text-green-400" />
        <span className="text-green-400 text-sm font-semibold">+{apy}% APY</span>
      </div>
      <div className="text-gray-400 text-sm">24h</div>
    </div>
  </motion.div>
);

const DEXLiquidity: React.FC = () => {
  const [token1Amount, setToken1Amount] = useState('');
  const [token2Amount, setToken2Amount] = useState('');
  const [token1] = useState('DUJYO');
  const [token2] = useState('USDC');
  const [activeMode, setActiveMode] = useState<'add' | 'remove'>('add');
  const [isAdding, setIsAdding] = useState(false);

  const handleAddLiquidity = () => {
    setIsAdding(true);
    console.log(`Adding ${token1Amount} ${token1} and ${token2Amount} ${token2} to liquidity.`);
    // In a real app, this would interact with the blockchain to add liquidity
    setTimeout(() => setIsAdding(false), 2000);
  };

  const handleRemoveLiquidity = () => {
    console.log(`Removing liquidity for ${token1} and ${token2}.`);
    // In a real app, this would interact with the blockchain to remove liquidity
  };

  const getTokenColor = (token: string) => {
    switch (token) {
      case 'DUJYO': return '#00F5FF';
      case 'USDC': return '#EA580C';
      case 'ETH': return '#8B5CF6';
      default: return '#F59E0B';
    }
  };

  // Get real liquidity positions from blockchain
  const [realPositions, setRealPositions] = useState<any[]>([]);
  const [isLoadingPositions, setIsLoadingPositions] = useState(true);

  useEffect(() => {
    const loadRealPositions = async () => {
      try {
        setIsLoadingPositions(true);
        // Get real liquidity positions from blockchain
        const response = await fetch('http://localhost:8083/pool/DUJYO_USDC');
        if (response.ok) {
          const poolData = await response.json();
          console.log('Pool data loaded:', poolData);
          // Convert pool data to position format
          const positions = [{
            pair: 'DUJYO/USDC',
            share: 0.0, // Will be calculated based on user's LP tokens
            value: '$0.00', // Will be calculated based on pool reserves
            apy: 0.0 // Will be calculated based on pool activity
          }];
          setRealPositions(positions);
        } else {
          setRealPositions([]);
        }
      } catch (error) {
        console.error('Error loading liquidity positions:', error);
        setRealPositions([]);
      } finally {
        setIsLoadingPositions(false);
      }
    };

    loadRealPositions();
  }, []);

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* Main Liquidity Card */}
      <motion.div
        className="bg-gray-900/70 backdrop-blur-lg rounded-3xl p-8 border border-pink-500/30 shadow-2xl"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        style={{
          boxShadow: '0 0 50px rgba(245, 158, 11, 0.2), 0 0 100px rgba(245, 158, 11, 0.1)'
        }}
      >
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-3xl font-bold text-white">Manage Liquidity</h2>
          <motion.button
            className="p-2 text-gray-400 hover:text-white transition-colors"
            whileHover={{ rotate: 180 }}
            transition={{ duration: 0.3 }}
          >
            <Info size={20} />
          </motion.button>
        </div>

        {/* Mode Toggle */}
        <div className="flex justify-center space-x-4 mb-8">
          <motion.button 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeMode === 'add' 
                ? 'bg-pink-500/30 text-orange-400 border border-pink-400/50' 
                : 'bg-gray-700/30 text-gray-400 border border-gray-600/50'
            }`}
            onClick={() => setActiveMode('add')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Plus size={18} />
            <span>Add Liquidity</span>
          </motion.button>
          <motion.button 
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-300 ${
              activeMode === 'remove' 
                ? 'bg-pink-500/30 text-orange-400 border border-pink-400/50' 
                : 'bg-gray-700/30 text-gray-400 border border-gray-600/50'
            }`}
            onClick={() => setActiveMode('remove')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Minus size={18} />
            <span>Remove Liquidity</span>
          </motion.button>
        </div>

        <AnimatePresence mode="wait">
          {activeMode === 'add' && (
            <motion.div
              key="add"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <LiquidityInput
                label="Token 1"
                value={token1Amount}
                onChange={(e) => setToken1Amount(e.target.value)}
                token={token1}
                balance="0.0"
                color={getTokenColor(token1)}
              />

              <LiquidityInput
                label="Token 2"
                value={token2Amount}
                onChange={(e) => setToken2Amount(e.target.value)}
                token={token2}
                balance="5000.0"
                color={getTokenColor(token2)}
              />

              {/* Pool Share Info */}
              <motion.div 
                className="flex items-center justify-between text-gray-400 text-sm mb-6 p-3 bg-gray-800/30 rounded-lg"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <span>Your Pool Share</span>
                <span className="text-orange-400 font-semibold">0.05%</span>
              </motion.div>

              {/* Add Liquidity Button */}
              <motion.button
                className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-4 rounded-xl text-lg hover:from-orange-400 hover:to-purple-500 transition-all duration-300 shadow-lg relative overflow-hidden"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleAddLiquidity}
                disabled={isAdding}
                style={{
                  boxShadow: '0 0 30px rgba(245, 158, 11, 0.5)'
                }}
              >
                <motion.div
                  className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent"
                  animate={{
                    x: ['-100%', '100%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "linear"
                  }}
                />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isAdding ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Droplets size={20} />
                      </motion.div>
                      Adding Liquidity...
                    </>
                  ) : (
                    <>
                      <Droplets size={20} />
                      Add Liquidity
                    </>
                  )}
                </span>
              </motion.button>
            </motion.div>
          )}

          {activeMode === 'remove' && (
            <motion.div
              key="remove"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center text-gray-400 mb-6">
                <p>Select a liquidity position to remove</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Help Link */}
        <div className="flex justify-center mt-6">
          <motion.button 
            className="flex items-center gap-2 text-gray-400 text-sm hover:text-orange-400 transition-colors"
            whileHover={{ scale: 1.05 }}
          >
            <Info size={16} />
            <span>What is Liquidity?</span>
          </motion.button>
        </div>
      </motion.div>

      {/* Existing Positions */}
      {!isLoadingPositions && realPositions.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <BarChart3 size={24} className="text-orange-400" />
            Your Liquidity Positions
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {realPositions.map((position, index) => (
              <LiquidityPosition
                key={index}
                pair={position.pair}
                share={position.share}
                value={position.value}
                apy={position.apy}
                onRemove={handleRemoveLiquidity}
              />
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DEXLiquidity;