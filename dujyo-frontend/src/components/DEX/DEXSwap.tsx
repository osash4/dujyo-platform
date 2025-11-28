import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Repeat, Maximize2, Zap, ChevronDown, Settings, Coins } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useBlockchain } from '../../contexts/BlockchainContext';
import { useUnifiedBalance } from '../../hooks/useUnifiedBalance';
import { BalanceUpdateNotification } from '../common/BalanceUpdateNotification';
import { getApiBaseUrl } from '../../utils/apiConfig';

const TokenInput: React.FC<{ 
  label: string; 
  value: string; 
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  token: string; 
  onMax?: () => void;
  balance?: string;
  color: string;
}> = ({ label, value, onChange, token, onMax, balance, color }) => (
  <motion.div 
    className="bg-gray-800/30 backdrop-blur-lg rounded-xl p-4 mb-4 border border-gray-600/30 hover:border-gray-500/50 transition-all duration-300"
    whileHover={{ scale: 1.01 }}
  >
    <div className="flex justify-between items-center mb-2">
      <label className="text-gray-300 text-sm font-medium">{label}</label>
      <div className="flex items-center gap-2">
        {balance && (
          <span className="text-gray-400 text-xs">Balance: {balance}</span>
        )}
        {onMax && (
          <motion.button 
            onClick={onMax} 
            className="text-amber-400 text-sm font-medium hover:text-amber-300 transition-colors px-2 py-1 rounded hover:bg-amber-400/10"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Max
          </motion.button>
        )}
      </div>
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
        className="flex items-center gap-2 bg-gray-700/50 rounded-lg px-3 py-2 cursor-pointer hover:bg-gray-600/50 transition-all duration-300"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
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
        <ChevronDown size={16} className="text-gray-400" />
      </motion.div>
    </div>
  </motion.div>
);

const DEXSwap: React.FC = () => {
  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState('DYO');
  const [toToken, setToToken] = useState('DYS');
  const [isSwapping, setIsSwapping] = useState(false);
  const [showLightning, setShowLightning] = useState(false);
  const [swapMessage, setSwapMessage] = useState('');
  const [txHash, setTxHash] = useState('');
  // ✅ USAR HOOK UNIFICADO
  const { available_dyo, dys, isUpdating, refreshBalance } = useUnifiedBalance();
  const [isStaking, setIsStaking] = useState(false);
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakingMessage, setStakingMessage] = useState('');
  const [isMinting, setIsMinting] = useState(false);
  const [mintAmount, setMintAmount] = useState('');
  const [mintMessage, setMintMessage] = useState('');
  const [showBalanceNotification, setShowBalanceNotification] = useState(false);
  const [previousBalance, setPreviousBalance] = useState(0);
  
  const { user } = useAuth();
  const { account } = useBlockchain();

  // ✅ FUNCIÓN PARA ACTUALIZAR BALANCES DESPUÉS DE TRANSACCIONES
  const updateBalancesAfterTransaction = async () => {
    try {
      // Usar el refreshBalance del hook unificado
      setPreviousBalance(available_dyo);
      await refreshBalance();
      setShowBalanceNotification(true);
      
      console.log('✅ [DEX] Balances updated after transaction');
    } catch (error) {
      console.error('❌ Error updating balances after transaction:', error);
    }
  };

  // ✅ useUnifiedBalance ya maneja la carga automática de balances
  // No necesitamos un useEffect adicional

  const handleSwapTokens = () => {
    // In a real application, this would swap the token states
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Calculate real USDC equivalent from blockchain data
  const calculateUSDCEquivalent = (amount: number, token: string) => {
    // Get real conversion rate from blockchain or DEX pool
    if (token === 'DYO') {
      return (amount * 1.0).toFixed(2); // DYO to DYS is 1:1 in our DEX
    } else if (token === 'DYS') {
      return (amount * 1.0).toFixed(2); // DYS is pegged to USDC
    }
    return '0.00';
  };

  // Update toAmount when fromAmount changes
  useEffect(() => {
    if (fromAmount && !isNaN(parseFloat(fromAmount))) {
      const amount = parseFloat(fromAmount);
      const equivalent = calculateUSDCEquivalent(amount, fromToken);
      setToAmount(equivalent);
    } else {
      setToAmount('');
    }
  }, [fromAmount, fromToken]);

  // Handle staking
  const handleStake = async () => {
    if (!user || !account) {
      setStakingMessage('Please connect your wallet first');
      return;
    }

    if (!stakeAmount || isNaN(parseFloat(stakeAmount))) {
      setStakingMessage('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (amount <= 0) {
      setStakingMessage('Amount must be greater than 0');
      return;
    }

    if (amount > available_dyo) {
      setStakingMessage('Insufficient balance for staking');
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000);

    try {
      setIsStaking(true);
      setStakingMessage('');

      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Call real staking endpoint
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/stake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          account: user.uid,
          amount: amount
        }),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let result;
      try {
        const responseText = await response.text();
        if (responseText.trim() === '') {
          result = { success: false, message: "Empty response from server" };
        } else {
          result = JSON.parse(responseText);
        }
      } catch (parseError) {
        result = { success: false, message: "Invalid JSON response from server" };
      }
      
      console.log('Stake result:', result);
      
      if (result.success) {
        setStakingMessage(`${result.message}`);
        setStakeAmount('');
        
        // ✅ ACTUALIZAR BALANCES DESPUÉS DE STAKE EXITOSO
        await updateBalancesAfterTransaction();
      } else {
        setStakingMessage(`${result.message}`);
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Staking error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setStakingMessage('Request was cancelled or timed out. Please try again.');
      } else {
        setStakingMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsStaking(false);
    }
  };

  // Handle unstaking
  const handleUnstake = async () => {
    if (!user || !account) {
      setStakingMessage('Please connect your wallet first');
      return;
    }

    if (!stakeAmount || isNaN(parseFloat(stakeAmount))) {
      setStakingMessage('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(stakeAmount);
    if (amount <= 0) {
      setStakingMessage('Amount must be greater than 0');
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000);

    try {
      setIsStaking(true);
      setStakingMessage('');

      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Call real unstaking endpoint
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/unstake`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          account: user.uid,
          amount: amount
        }),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      let result;
      try {
        const responseText = await response.text();
        if (responseText.trim() === '') {
          result = { success: false, message: "Empty response from server" };
        } else {
          result = JSON.parse(responseText);
        }
      } catch (parseError) {
        result = { success: false, message: "Invalid JSON response from server" };
      }
      
      console.log('Unstake result:', result);
      
      if (result.success) {
        setStakingMessage(`${result.message}`);
        setStakeAmount('');
        
        // ✅ ACTUALIZAR BALANCES DESPUÉS DE UNSTAKE EXITOSO
        await updateBalancesAfterTransaction();
      } else {
        setStakingMessage(`${result.message}`);
      }
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Unstaking error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setStakingMessage('Request was cancelled or timed out. Please try again.');
      } else {
        setStakingMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsStaking(false);
    }
  };

  // Handle minting tokens
  const handleMint = async () => {
    if (!user || !account) {
      setMintMessage('Please connect your wallet first');
      return;
    }

    if (!mintAmount || isNaN(parseFloat(mintAmount))) {
      setMintMessage('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(mintAmount);
    if (amount <= 0) {
      setMintMessage('Amount must be greater than 0');
      return;
    }

    if (amount > 10000) {
      setMintMessage('Maximum mint amount is 10,000 DYO');
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000);

    try {
      setIsMinting(true);
      setMintMessage('');

      // Get JWT token from localStorage
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Call the mint endpoint
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/mint`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          account: user.uid,
          amount: amount
        }),
        signal: abortController.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to mint tokens');
      }

      const result = await response.json();
      console.log('Mint result:', result);
      setMintMessage(`Successfully minted ${amount} DYO tokens!`);
      setMintAmount('');
      
      // ✅ ACTUALIZAR BALANCES DESPUÉS DE MINT EXITOSO
      await updateBalancesAfterTransaction();
      
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Minting error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setMintMessage('Request was cancelled or timed out. Please try again.');
      } else {
        setMintMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsMinting(false);
    }
  };

  const handleConfirmSwap = async () => {
    if (!user || !account) {
      setSwapMessage('Please connect your wallet first');
      return;
    }

    if (!fromAmount || parseFloat(fromAmount) <= 0) {
      setSwapMessage('Please enter a valid amount');
      return;
    }

    const amount = parseFloat(fromAmount);
    
    // ✅ VALIDACIONES DE BALANCE REALES
    if (fromToken === 'DYO' && amount > available_dyo) {
      setSwapMessage(`Insufficient DYO balance. Available: ${available_dyo.toFixed(2)} DYO`);
      return;
    }
    
    if (fromToken === 'DYS' && amount > dys) {
      setSwapMessage(`Insufficient DYS balance. Available: ${dys.toFixed(2)} DYS`);
      return;
    }

    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), 30000);

    setIsSwapping(true);
    setShowLightning(true);
    setSwapMessage('');

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Calculate intelligent slippage for native platform tokens
      const calculateMinReceived = (expectedAmount: number) => {
        // For native Dujyo platform tokens, use low slippage (2%)
        const baseSlippage = 0.02; // 2% slippage
        return expectedAmount * (1 - baseSlippage);
      };

      // Prepare swap request - ensure consistent address format
      const swapRequest = {
        from: fromToken,
        to: toToken,
        amount: parseFloat(fromAmount),
        min_received: calculateMinReceived(parseFloat(toAmount)), // 2% slippage for native tokens
        user: user?.uid || account // Use consistent user ID from auth
      };

      console.log('Executing swap:', swapRequest);

      // Execute swap on blockchain
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/swap`, {
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
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Swap result:', result);

      if (result.success) {
        setSwapMessage(`Swap successful! Transaction: ${result.tx_hash}`);
        setTxHash(result.tx_hash);
        // Update amounts based on actual result
        if (result.amount_received) {
          setToAmount(result.amount_received.toString());
        }
        
        // ✅ ACTUALIZAR BALANCES DESPUÉS DE SWAP EXITOSO
        await updateBalancesAfterTransaction();
      } else {
        // Provide more specific error messages
        if (result.message && result.message.includes('Insufficient output amount')) {
          setSwapMessage('Price updated. Please try the swap again.');
        } else {
          setSwapMessage(`Swap failed: ${result.message}`);
        }
      }
    } catch (error) {
      clearTimeout(timeoutId);
      console.error('Swap error:', error);
      
      if (error instanceof Error && error.name === 'AbortError') {
        setSwapMessage('Request was cancelled or timed out. Please try again.');
      } else if (error instanceof Error && error.message.includes('Insufficient output amount')) {
        setSwapMessage('Price updated. Please try the swap again.');
      } else {
        setSwapMessage(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } finally {
      setIsSwapping(false);
      setTimeout(() => {
        setShowLightning(false);
      }, 2000);
    }
  };

  const getTokenColor = (token: string) => {
    switch (token) {
      case 'DYO': return '#00F5FF';
      case 'DYS': return '#EA580C';
      case 'ETH': return '#8B5CF6';
      default: return '#F59E0B';
    }
  };

  return (
    <motion.div
      className="relative bg-gray-900/70 backdrop-blur-lg rounded-3xl p-8 border border-green-400/30 shadow-2xl max-w-md w-full"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      style={{
        boxShadow: '0 0 50px rgba(57, 255, 20, 0.2), 0 0 100px rgba(57, 255, 20, 0.1)'
      }}
    >
      {/* Lightning Effect Overlay */}
      <AnimatePresence>
        {showLightning && (
          <motion.div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-green-400/20 to-transparent"
              animate={{
                x: ['-100%', '100%'],
              }}
              transition={{
                duration: 0.8,
                ease: "easeInOut"
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-bold text-white">Swap Tokens</h2>
        <motion.button
          className="p-2 text-gray-400 hover:text-white transition-colors"
          whileHover={{ rotate: 180 }}
          transition={{ duration: 0.3 }}
        >
          <Settings size={20} />
        </motion.button>
      </div>

      {/* From Token Input */}
      <TokenInput
        label="You pay"
        value={fromAmount}
        onChange={(e) => setFromAmount(e.target.value)}
        token={fromToken}
        onMax={() => setFromAmount(fromToken === 'DYO' ? available_dyo.toString() : dys.toString())}
        balance={isUpdating ? 'Loading...' : (
          fromToken === 'DYO' ? 
            `${available_dyo.toFixed(2)} DYO` : 
            `${dys.toFixed(2)} DYS`
        )}
        color={getTokenColor(fromToken)}
      />

      {/* Swap Button */}
      <div className="flex justify-center my-4">
        <motion.button
          onClick={handleSwapTokens}
          className="p-3 bg-gray-700/70 rounded-full border border-gray-600/50 text-gray-300 hover:text-green-400 hover:border-green-500 transition-all duration-300 relative"
          whileHover={{ rotate: 180, scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            boxShadow: '0 0 20px rgba(57, 255, 20, 0.3)'
          }}
        >
          <Repeat size={20} />
        </motion.button>
      </div>

      {/* To Token Input */}
      <TokenInput
        label="You receive"
        value={toAmount}
        onChange={(e) => setToAmount(e.target.value)}
        token={toToken}
        balance={isUpdating ? 'Loading...' : (
          toToken === 'DYO' ? 
            `${available_dyo.toFixed(2)} DYO` : 
            `${dys.toFixed(2)} DYS`
        )}
        color={getTokenColor(toToken)}
      />

      {/* Exchange Rate */}
      <motion.div 
        className="flex justify-between items-center text-gray-400 text-sm mb-6 p-3 bg-gray-800/30 rounded-lg"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <span>Exchange Rate</span>
        <span className="text-white font-semibold">1 {fromToken} = 1.0 {toToken}</span>
      </motion.div>

      {/* Confirm Swap Button */}
      <motion.button
        className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-4 rounded-xl text-lg hover:from-green-400 hover:to-emerald-500 transition-all duration-300 shadow-lg relative overflow-hidden"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={handleConfirmSwap}
        disabled={isSwapping}
        style={{
          boxShadow: '0 0 30px rgba(57, 255, 20, 0.5)'
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
          {isSwapping ? (
            <>
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              >
                <Zap size={20} />
              </motion.div>
              Swapping...
            </>
          ) : (
            <>
              <Zap size={20} />
              Confirm Swap
            </>
          )}
        </span>
      </motion.button>

      {/* Swap Message */}
      {swapMessage && (
        <motion.div
          className={`mt-4 p-3 rounded-lg text-sm font-medium ${
            swapMessage.includes('Success') 
              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
              : 'bg-red-500/20 text-red-400 border border-red-500/50'
          }`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {swapMessage}
        </motion.div>
      )}

      {/* Transaction Hash */}
      {txHash && (
        <motion.div
          className="mt-2 p-2 bg-gray-800/50 rounded-lg text-xs text-gray-400"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="font-mono break-all">
            TX: {txHash}
          </div>
        </motion.div>
      )}

      {/* Staking Section */}
      <motion.div
        className="mt-8 p-6 bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-600/30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Coins className="w-5 h-5 text-yellow-400" />
          <h3 className="text-lg font-semibold text-white">Staking</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Amount to Stake (DYO)</label>
            <input
              type="number"
              value={stakeAmount}
              onChange={(e) => setStakeAmount(e.target.value)}
              placeholder="0.0"
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-yellow-400 focus:ring-1 focus:ring-yellow-400"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400">Available: {available_dyo.toFixed(2)} DYO</span>
              <button
                onClick={() => setStakeAmount(available_dyo.toString())}
                className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                Max
              </button>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
          <motion.button
            onClick={handleStake}
            disabled={isStaking || !stakeAmount}
              className="bg-gradient-to-r from-yellow-500 to-orange-600 text-white font-bold py-3 rounded-lg hover:from-yellow-400 hover:to-orange-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isStaking ? 'Staking...' : 'Stake DYO'}
          </motion.button>
            
            <motion.button
              onClick={handleUnstake}
              disabled={isStaking || !stakeAmount}
              className="bg-gradient-to-r from-red-500 to-orange-600 text-white font-bold py-3 rounded-lg hover:from-red-400 hover:to-orange-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isStaking ? 'Unstaking...' : 'Unstake DYO'}
            </motion.button>
          </div>
          
          {stakingMessage && (
            <motion.div
              className={`p-3 rounded-lg text-sm font-medium ${
                stakingMessage.includes('Success') 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/50'
              }`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {stakingMessage}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Mint Tokens Section */}
      <motion.div
        className="mt-8 p-6 bg-gray-800/30 backdrop-blur-lg rounded-xl border border-gray-600/30"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
      >
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Mint Tokens</h3>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-300 mb-2">Amount to Mint (DYO)</label>
            <input
              type="number"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="0.0"
              max="10000"
              className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
            />
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-400">Max: 10,000 DYO per mint</span>
              <button
                onClick={() => setMintAmount('1000')}
                className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                Quick: 1000
              </button>
            </div>
          </div>
          
          <motion.button
            onClick={handleMint}
            disabled={isMinting || !mintAmount}
            className="w-full bg-gradient-to-r from-orange-500 to-orange-600 text-white font-bold py-3 rounded-lg hover:from-blue-400 hover:to-purple-500 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {isMinting ? 'Minting...' : 'Mint DYO Tokens'}
          </motion.button>
          
          {mintMessage && (
            <motion.div
              className={`p-3 rounded-lg text-sm font-medium ${
                mintMessage.includes('Success') 
                  ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                  : 'bg-red-500/20 text-red-400 border border-red-500/50'
              }`}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {mintMessage}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Additional Actions */}
      <div className="flex justify-center mt-6 space-x-4">
        <motion.button 
          className="flex items-center gap-2 text-gray-400 text-sm hover:text-green-400 transition-colors"
          whileHover={{ scale: 1.05 }}
        >
          <Maximize2 size={16} />
          <span>View Chart</span>
        </motion.button>
        <motion.button 
          className="flex items-center gap-2 text-gray-400 text-sm hover:text-green-400 transition-colors"
          whileHover={{ scale: 1.05 }}
        >
          <Settings size={16} />
          <span>Settings</span>
        </motion.button>
      </div>

      {/* Balance Update Notification */}
      <BalanceUpdateNotification
        show={showBalanceNotification}
        newBalance={available_dyo}
        previousBalance={previousBalance}
        onClose={() => setShowBalanceNotification(false)}
      />
    </motion.div>
  );
};

export default DEXSwap;