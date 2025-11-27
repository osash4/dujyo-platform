import React, { createContext, useContext, useState, ReactNode } from 'react';

interface DEXContextType {
  // Define your DEX-related state and functions here
  // For example:
  currentPair: string;
  setCurrentPair: (pair: string) => void;
  // Add more as needed for swap, liquidity, etc.
}

const DEXContext = createContext<DEXContextType | undefined>(undefined);

export const DEXProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentPair, setCurrentPair] = useState('DUJYO/USDC');

  // Add more state and functions here

  const value = {
    currentPair,
    setCurrentPair,
  };

  return <DEXContext.Provider value={value}>{children}</DEXContext.Provider>;
};

export const useDEX = () => {
  const context = useContext(DEXContext);
  if (context === undefined) {
    throw new Error('useDEX must be used within a DEXProvider');
  }
  return context;
};