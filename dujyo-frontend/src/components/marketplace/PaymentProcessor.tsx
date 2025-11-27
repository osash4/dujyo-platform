import React, { useState } from 'react';
import { useBlockchain } from '../../contexts/BlockchainContext';

export function PaymentProcessor({ method, amount, onComplete }) {
  const { account } = useBlockchain();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleCryptoPayment = async () => {
    setProcessing(true);
    setError(null);

    try {
      const paymentDetails = {
        from: account,
        amount,
        currency: 'DYO', // ✅ Dujyo native token (NOT ETH)
        timestamp: Date.now()
      };

      // ✅ Process payment through Dujyo blockchain (native)
      const response = await fetch('http://localhost:8083/api/blockchain/transaction', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: account,
          to: process.env.REACT_APP_PLATFORM_WALLET_ADDRESS || (() => {
            const storedWallet = localStorage.getItem('xwave_wallet');
            return storedWallet ? JSON.parse(storedWallet).address : '';
          })(),
          amount: amount * 100, // Convert to cents
          token: 'DYO',
        }),
      });

      if (!response.ok) {
        throw new Error('Transaction failed');
      }

      const data = await response.json();
      paymentDetails.transactionHash = data.tx_hash;

      onComplete(paymentDetails);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setProcessing(false);
    }
  };

  const handleCardPayment = async (formData) => {
    setProcessing(true);
    setError(null);

    try {
      // Implement card payment processing
      const paymentDetails = {
        method: 'card',
        amount,
        currency: 'USD',
        timestamp: Date.now()
      };

      onComplete(paymentDetails);
    } catch (err) {
      setError(err.message);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md">
          {error}
        </div>
      )}

      {method === 'crypto' ? (
        <button
          onClick={handleCryptoPayment}
          disabled={processing}
          className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {processing ? 'Processing...' : `Pay ${amount} DYO`}
        </button>
      ) : (
        <form onSubmit={handleCardPayment} className="space-y-4">
          {/* Add credit card form fields here */}
          <button
            type="submit"
            disabled={processing}
            className="w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
          >
            {processing ? 'Processing...' : `Pay $${amount}`}
          </button>
        </form>
      )}
    </div>
  );
}