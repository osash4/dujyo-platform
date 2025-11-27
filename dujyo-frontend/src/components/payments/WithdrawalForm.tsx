import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowDownRight, Wallet, CreditCard, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { useRetry } from '../../hooks/useRetry';
import { useCache } from '../../hooks/useCache';

interface WithdrawalFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

type WithdrawalMethod = 'crypto' | 'bank' | 'stripe';
type Currency = 'DYO' | 'DYS' | 'USD';

const WithdrawalForm: React.FC<WithdrawalFormProps> = ({ onClose, onSuccess }) => {
  const { user } = useAuth();
  const [method, setMethod] = useState<WithdrawalMethod>('crypto');
  const [currency, setCurrency] = useState<Currency>('DYS');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Crypto fields
  const [cryptoAddress, setCryptoAddress] = useState('');
  const [cryptoNetwork, setCryptoNetwork] = useState('dujyo'); // ✅ Dujyo native blockchain

  // Bank fields
  const [accountNumber, setAccountNumber] = useState('');
  const [routingNumber, setRoutingNumber] = useState('');
  const [accountType, setAccountType] = useState('checking');

  // Stripe fields
  const [stripeAccountId, setStripeAccountId] = useState('');

  const [limits, setLimits] = useState<any>(null);

  // Hooks must be called before useEffect
  const cache = useCache<any>(5 * 60 * 1000); // 5-minute cache
  const fetchWithRetry = useRetry(
    async (url: string, options: RequestInit = {}) => {
      const response = await fetch(url, options);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    { maxAttempts: 3, initialDelay: 1000 }
  );

  const fetchLimits = useCallback(async () => {
    const cacheKey = 'withdrawal-limits';
    const cached = cache.get(cacheKey);
    if (cached) {
      setLimits(cached);
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const data = await fetchWithRetry(`${apiBaseUrl}/api/v1/payments/limits`, {});
      setLimits(data);
      cache.set(cacheKey, data);
    } catch (error) {
      console.error('Error fetching limits:', error);
      // Try to use cached data if available
      const cached = cache.get(cacheKey);
      if (cached) {
        setLimits(cached);
      }
    }
  }, [cache, fetchWithRetry]);

  useEffect(() => {
    fetchLimits();
  }, [fetchLimits]);

  const calculateFee = (amount: number, currency: Currency): number => {
    if (!amount) return 0;
    switch (currency) {
      case 'DYO':
        return amount * 0.001; // 0.1%
      case 'DYS':
        return amount * 0.0015; // 0.15%
      case 'USD':
        return amount * 0.025 + 2.0; // 2.5% + $2
      default:
        return 0;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const withdrawalAmount = parseFloat(amount);
      if (isNaN(withdrawalAmount) || withdrawalAmount <= 0) {
        throw new Error('Please enter a valid amount');
      }

      // Validate limits
      if (limits) {
        if (withdrawalAmount < limits.min_amount) {
          throw new Error(`Minimum withdrawal amount is $${limits.min_amount}`);
        }
        if (withdrawalAmount > limits.max_amount) {
          throw new Error(`Maximum withdrawal amount is $${limits.max_amount}`);
        }
      }

      // Build destination based on method
      let destination: any = {};
      switch (method) {
        case 'crypto':
          if (!cryptoAddress) {
            throw new Error('Please enter a crypto address');
          }
          destination = {
            destination_type: 'crypto',
            address: cryptoAddress,
            network: cryptoNetwork,
          };
          break;
        case 'bank':
          if (!accountNumber || !routingNumber) {
            throw new Error('Please enter account and routing numbers');
          }
          destination = {
            destination_type: 'bank',
            account_number: accountNumber,
            routing_number: routingNumber,
            account_type: accountType,
          };
          break;
        case 'stripe':
          if (!stripeAccountId) {
            throw new Error('Please enter Stripe account ID');
          }
          destination = {
            destination_type: 'stripe',
            stripe_account_id: stripeAccountId,
          };
          break;
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/payments/withdraw`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          amount: withdrawalAmount,
          currency,
          destination,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'Withdrawal failed');
      }

      setSuccess(true);
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const fee = calculateFee(parseFloat(amount) || 0, currency);
  const netAmount = (parseFloat(amount) || 0) - fee;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">New Withdrawal</h2>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {success ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ArrowDownRight className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Withdrawal Requested!</h3>
                <p className="text-gray-400">
                  Your withdrawal request has been submitted and is being processed.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Withdrawal Method */}
                <div>
                  <label className="block text-white font-semibold mb-3">
                    Withdrawal Method
                  </label>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      type="button"
                      onClick={() => setMethod('crypto')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        method === 'crypto'
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      <Wallet className="w-6 h-6 mx-auto mb-2 text-white" />
                      <p className="text-white text-sm font-medium">Crypto</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod('bank')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        method === 'bank'
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      <Building2 className="w-6 h-6 mx-auto mb-2 text-white" />
                      <p className="text-white text-sm font-medium">Bank</p>
                    </button>
                    <button
                      type="button"
                      onClick={() => setMethod('stripe')}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        method === 'stripe'
                          ? 'border-purple-500 bg-purple-500/20'
                          : 'border-gray-700 bg-gray-700/50 hover:border-gray-600'
                      }`}
                    >
                      <CreditCard className="w-6 h-6 mx-auto mb-2 text-white" />
                      <p className="text-white text-sm font-medium">Stripe</p>
                    </button>
                  </div>
                </div>

                {/* Currency */}
                <div>
                  <label className="block text-white font-semibold mb-2">Currency</label>
                  <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as Currency)}
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                  >
                    <option value="DYO">DYO</option>
                    <option value="DYS">DYS (Stablecoin)</option>
                    <option value="USD">USD (Fiat)</option>
                  </select>
                </div>

                {/* Amount */}
                <div>
                  <label className="block text-white font-semibold mb-2">Amount</label>
                  <input
                    type="number"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.00"
                    min={limits?.min_amount || 0}
                    max={limits?.max_amount || 100000}
                    step="0.01"
                    required
                    className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                  />
                  {limits && (
                    <p className="text-gray-400 text-sm mt-1">
                      Min: ${limits.min_amount} | Max: ${limits.max_amount}
                    </p>
                  )}
                </div>

                {/* Destination Fields */}
                {method === 'crypto' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">Crypto Address</label>
                      <input
                        type="text"
                        value={cryptoAddress}
                        onChange={(e) => setCryptoAddress(e.target.value)}
                        placeholder="0x..."
                        required
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Network</label>
                      <select
                        value={cryptoNetwork}
                        onChange={(e) => setCryptoNetwork(e.target.value)}
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                      >
                        <option value="dujyo">Dujyo (Native)</option>
                        {/* ✅ Dujyo native blockchain - NO Ethereum/Polygon/Arbitrum */}
                      </select>
                    </div>
                  </div>
                )}

                {method === 'bank' && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-white font-semibold mb-2">Account Number</label>
                      <input
                        type="text"
                        value={accountNumber}
                        onChange={(e) => setAccountNumber(e.target.value)}
                        placeholder="1234567890"
                        required
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Routing Number</label>
                      <input
                        type="text"
                        value={routingNumber}
                        onChange={(e) => setRoutingNumber(e.target.value)}
                        placeholder="123456789"
                        required
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">Account Type</label>
                      <select
                        value={accountType}
                        onChange={(e) => setAccountType(e.target.value)}
                        className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                      >
                        <option value="checking">Checking</option>
                        <option value="savings">Savings</option>
                      </select>
                    </div>
                  </div>
                )}

                {method === 'stripe' && (
                  <div>
                    <label className="block text-white font-semibold mb-2">Stripe Account ID</label>
                    <input
                      type="text"
                      value={stripeAccountId}
                      onChange={(e) => setStripeAccountId(e.target.value)}
                      placeholder="acct_..."
                      required
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded-lg border border-gray-600 focus:border-purple-500 focus:outline-none"
                    />
                  </div>
                )}

                {/* Fee Summary */}
                {amount && parseFloat(amount) > 0 && (
                  <div className="bg-gray-700 p-4 rounded-lg space-y-2">
                    <div className="flex justify-between text-gray-300">
                      <span>Amount:</span>
                      <span className="font-semibold">${parseFloat(amount).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Fee ({currency === 'USD' ? '2.5% + $2' : currency === 'DYS' ? '0.15%' : '0.1%'}):</span>
                      <span className="font-semibold text-yellow-400">${fee.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-white font-bold text-lg pt-2 border-t border-gray-600">
                      <span>You'll receive:</span>
                      <span className="text-green-400">${netAmount.toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Error Message */}
                {error && (
                  <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 flex items-center space-x-2">
                    <AlertCircle className="w-5 h-5 text-red-400" />
                    <p className="text-red-400">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex space-x-4">
                  <button
                    type="button"
                    onClick={onClose}
                    className="flex-1 bg-gray-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !amount || parseFloat(amount) <= 0}
                    className="btn-primary flex-1 px-6 py-3"
                  >
                    {loading ? 'Processing...' : 'Request Withdrawal'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default WithdrawalForm;

