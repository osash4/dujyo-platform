import React, { useState, useEffect } from "react";
import { motion } from 'framer-motion';
import { useBlockchain } from '../../contexts/BlockchainContext';

// Actualiza la interfaz para incluir tanto walletAddress como balance
interface WalletBalanceProps {
  walletAddress: string | null;  // La dirección de la billetera
  balance: number;  // Propiedad balance agregada
  showAvailable?: boolean;  // Si mostrar solo balance disponible (sin staked)
}

export const WalletBalance: React.FC<WalletBalanceProps> = ({ walletAddress, balance, showAvailable = false }) => {
  const { currentBalance, lastBalanceUpdate, tokenBalance } = useBlockchain();
  const [formattedBalance, setFormattedBalance] = useState<string>("");
  const [isUpdating, setIsUpdating] = useState(false);

  // Use real-time balance from context if available, otherwise use prop
  const displayBalance = currentBalance > 0 ? currentBalance : balance;
  
  // Calculate available balance (total - staked)
  const availableBalance = showAvailable && tokenBalance ? 
    tokenBalance.dyo : displayBalance;

  useEffect(() => {
    if (walletAddress) {
      console.log(`Wallet address: ${walletAddress}`); // Mostrar la dirección de la billetera
    }
    // Aquí podrías formatear el balance o hacer más cálculos si es necesario
    setFormattedBalance(availableBalance.toLocaleString());  // Formateo de balance
  }, [availableBalance, lastBalanceUpdate]);  // Actualizar cuando el balance cambie

  // Show updating animation when balance changes
  useEffect(() => {
    if (lastBalanceUpdate > 0) {
      setIsUpdating(true);
      const timer = setTimeout(() => setIsUpdating(false), 1000);
      return () => clearTimeout(timer);
    }
  }, [lastBalanceUpdate]);

  return (
    <motion.div
      className={`flex items-center space-x-2 px-3 py-2 rounded-lg border transition-all duration-300 ${
        isUpdating 
          ? 'bg-blue-100 border-blue-300' 
          : 'bg-green-100 border-green-200'
      }`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className={`w-2 h-2 rounded-full ${
        isUpdating 
          ? 'bg-blue-400 animate-pulse' 
          : 'bg-green-400 animate-pulse'
      }`}></div>
      <div className="flex flex-col">
        <span className={`text-xs font-medium ${
          isUpdating ? 'text-blue-600' : 'text-green-600'
        }`}>
          {isUpdating ? 'Updating...' : 'Balance'}
        </span>
        <motion.span 
          className={`text-sm font-bold ${
            isUpdating ? 'text-blue-800' : 'text-green-800'
          }`}
          key={availableBalance} // Force re-render when balance changes
          initial={{ scale: 1.1, opacity: 0.7 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {formattedBalance} {showAvailable ? 'DYO (Available)' : 'DYO'}
        </motion.span>
      </div>
    </motion.div>
  );
};
