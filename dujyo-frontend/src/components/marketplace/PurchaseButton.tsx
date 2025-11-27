import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ShoppingCart, Loader2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useBlockchain } from '../../contexts/BlockchainContext';

interface PurchaseButtonProps {
  content: {
    id: number;
    title: string;
    creator: string;
    price: number;
  };
  onPurchaseComplete?: () => void;
}

export const PurchaseButton: React.FC<PurchaseButtonProps> = ({ content, onPurchaseComplete }) => {
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseMessage, setPurchaseMessage] = useState('');
  const { user } = useAuth();
  const { account } = useBlockchain();

  const handlePurchase = async () => {
    if (!user || !account) {
      setPurchaseMessage('Please connect your wallet first');
      return;
    }

    setIsPurchasing(true);
    setPurchaseMessage('');

    try {
      // Get JWT token from localStorage
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Prepare transaction request
      const transactionRequest = {
        from: account,
        to: content.creator, // Pay the creator
        amount: content.price,
        nft_id: content.id.toString()
      };

      console.log('Executing purchase transaction:', transactionRequest);

      // Execute transaction on blockchain
      const response = await fetch('http://localhost:8083/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(transactionRequest)
      });

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Authentication failed. Please login again.');
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Purchase result:', result);

      if (result.success) {
        setPurchaseMessage(`✅ Purchase successful! Transaction: ${result.transaction_id}`);
        if (onPurchaseComplete) {
          onPurchaseComplete();
        }
      } else {
        setPurchaseMessage(`❌ Purchase failed: ${result.message}`);
      }
    } catch (error) {
      console.error('Purchase error:', error);
      setPurchaseMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="space-y-2">
      <motion.button
        onClick={handlePurchase}
        disabled={isPurchasing}
        className="btn-primary w-full py-2 px-4 flex items-center justify-center gap-2"
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        {isPurchasing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Purchasing...</span>
          </>
        ) : (
          <>
            <ShoppingCart className="w-4 h-4" />
            <span>Buy for {content.price} DYO</span>
          </>
        )}
      </motion.button>

      {/* Purchase Message */}
      {purchaseMessage && (
        <motion.div
          className={`p-2 rounded-lg text-sm font-medium ${
            purchaseMessage.includes('✅') 
              ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
              : 'bg-red-500/20 text-red-400 border border-red-500/50'
          }`}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {purchaseMessage}
        </motion.div>
      )}
    </div>
  );
};
