import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, X, Send, Coins, AlertCircle } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useUnifiedBalance } from '../../hooks/useUnifiedBalance';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { useLanguage } from '../../contexts/LanguageContext';

interface TipButtonProps {
  artistAddress: string;
  artistName: string;
  presetAmounts?: number[];
  showMessageField?: boolean;
  compact?: boolean;
  contentId?: string;
  className?: string;
}

export const TipButton: React.FC<TipButtonProps> = ({
  artistAddress,
  artistName,
  presetAmounts = [1, 5, 10, 25],
  showMessageField = true,
  compact = false,
  contentId,
  className = ''
}) => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { available_dyo, refreshBalance } = useUnifiedBalance();
  const [showModal, setShowModal] = useState(false);
  const [selectedAmount, setSelectedAmount] = useState<number | null>(null);
  const [customAmount, setCustomAmount] = useState('');
  const [message, setMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resolvedArtistAddress, setResolvedArtistAddress] = useState<string | null>(null);
  const [isResolvingAddress, setIsResolvingAddress] = useState(false);

  // Resolve artist address from content_id if artistAddress looks like a content_id
  useEffect(() => {
    const resolveArtistAddress = async () => {
      // If artistAddress doesn't look like a wallet address (starts with DU), try to resolve from content_id
      if (!artistAddress.startsWith('DU')) {
        setIsResolvingAddress(true);
        try {
          const apiBaseUrl = getApiBaseUrl();
          // Try to get content details directly by content_id
          const contentIdToUse = contentId || artistAddress;
          
          if (contentIdToUse) {
            const response = await fetch(`${apiBaseUrl}/api/v1/content/${contentIdToUse}`, {
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (response.ok) {
              const data = await response.json();
              if (data.success && data.artist_id) {
                setResolvedArtistAddress(data.artist_id);
                return;
              }
            }
          }
          
          // Fallback: search in public content list
          const fallbackResponse = await fetch(`${apiBaseUrl}/api/v1/content/public?limit=1000`, {
            headers: {
              'Content-Type': 'application/json'
            }
          });
          
          if (fallbackResponse.ok) {
            const fallbackData = await fallbackResponse.json();
            if (fallbackData.content && Array.isArray(fallbackData.content)) {
              const content = fallbackData.content.find((c: any) => 
                c.content_id === contentIdToUse || c.content_id === artistAddress
              );
              if (content && content.artist_id) {
                setResolvedArtistAddress(content.artist_id);
                return;
              }
            }
          }
        } catch (err) {
          console.warn('Failed to resolve artist address from content:', err);
        } finally {
          setIsResolvingAddress(false);
        }
      } else if (artistAddress.startsWith('DU')) {
        // Already a valid address
        setResolvedArtistAddress(artistAddress);
      }
    };

    if (showModal) {
      resolveArtistAddress();
    }
  }, [showModal, artistAddress, contentId]);

  const handleAmountSelect = (amount: number) => {
    setSelectedAmount(amount);
    setCustomAmount('');
    setError(null);
  };

  const handleCustomAmountChange = (value: string) => {
    setCustomAmount(value);
    setSelectedAmount(null);
    setError(null);
  };

  const getFinalAmount = (): number => {
    if (selectedAmount !== null) {
      return selectedAmount;
    }
    const custom = parseFloat(customAmount);
    return isNaN(custom) || custom <= 0 ? 0 : custom;
  };

  const handleSendTip = async () => {
    const amount = getFinalAmount();
    
    if (amount <= 0) {
      setError('Please select or enter an amount');
      return;
    }

    if (amount > available_dyo) {
      setError(`Insufficient balance. Available: ${available_dyo.toFixed(2)} DYO`);
      return;
    }

    if (!user?.uid) {
      setError('Please log in to send tips');
      return;
    }

    // Use resolved address if available, otherwise use the provided one
    const finalArtistAddress = resolvedArtistAddress || artistAddress;
    
    if (!finalArtistAddress || !finalArtistAddress.startsWith('DU')) {
      setError('Unable to find artist address. Please try again.');
      return;
    }

    if (user.uid === finalArtistAddress) {
      setError('You cannot tip yourself');
      return;
    }

    setIsSending(true);
    setError(null);

    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/content/tips/send`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          receiver_address: finalArtistAddress,
          amount: amount,
          currency: 'DYO',
          message: message.trim() || undefined,
          content_id: contentId || undefined,
          is_public: true
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Failed to send tip' }));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      
      // Success!
      setSuccess(true);
      
      // Refresh balance
      refreshBalance();
      
      // Dispatch event for balance update
      window.dispatchEvent(new CustomEvent('dujyo:balance-updated', {
        detail: { 
          earned: -amount, // Negative because we're spending
          force: true 
        }
      }));

      // Close modal after 2 seconds
      setTimeout(() => {
        setShowModal(false);
        setSuccess(false);
        setSelectedAmount(null);
        setCustomAmount('');
        setMessage('');
        setError(null);
      }, 2000);

    } catch (err) {
      console.error('Error sending tip:', err);
      setError(err instanceof Error ? err.message : 'Failed to send tip. Please try again.');
    } finally {
      setIsSending(false);
    }
  };

  if (compact) {
    return (
      <>
        <button
          onClick={() => setShowModal(true)}
          className={`flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all text-sm ${className}`}
          title={`Support ${artistName}`}
        >
          <Heart className="w-4 h-4" />
          <span>Tip</span>
        </button>

        <AnimatePresence>
          {showModal && (
            <TipModal
              artistName={artistName}
              presetAmounts={presetAmounts}
              showMessageField={showMessageField}
              selectedAmount={selectedAmount}
              customAmount={customAmount}
              message={message}
              error={error}
              success={success}
              isSending={isSending}
              available_dyo={available_dyo}
              isResolvingAddress={isResolvingAddress}
              resolvedArtistAddress={resolvedArtistAddress}
              onClose={() => {
                setShowModal(false);
                setSuccess(false);
                setSelectedAmount(null);
                setCustomAmount('');
                setMessage('');
                setError(null);
                setResolvedArtistAddress(null);
              }}
              onAmountSelect={handleAmountSelect}
              onCustomAmountChange={handleCustomAmountChange}
              onMessageChange={setMessage}
              onSend={handleSendTip}
            />
          )}
        </AnimatePresence>
      </>
    );
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all shadow-lg hover:shadow-xl ${className}`}
      >
        <Heart className="w-5 h-5" />
        <span>💝 Support {artistName}</span>
      </button>

      <AnimatePresence>
        {showModal && (
          <TipModal
            artistName={artistName}
            presetAmounts={presetAmounts}
            showMessageField={showMessageField}
            selectedAmount={selectedAmount}
            customAmount={customAmount}
            message={message}
            error={error}
            success={success}
            isSending={isSending}
            available_dyo={available_dyo}
            onClose={() => {
              setShowModal(false);
              setSuccess(false);
              setSelectedAmount(null);
              setCustomAmount('');
              setMessage('');
              setError(null);
            }}
            onAmountSelect={handleAmountSelect}
            onCustomAmountChange={handleCustomAmountChange}
            onMessageChange={setMessage}
            onSend={handleSendTip}
          />
        )}
      </AnimatePresence>
    </>
  );
};

interface TipModalProps {
  artistName: string;
  presetAmounts: number[];
  showMessageField: boolean;
  selectedAmount: number | null;
  customAmount: string;
  message: string;
  error: string | null;
  success: boolean;
  isSending: boolean;
  available_dyo: number;
  isResolvingAddress?: boolean;
  resolvedArtistAddress?: string | null;
  onClose: () => void;
  onAmountSelect: (amount: number) => void;
  onCustomAmountChange: (value: string) => void;
  onMessageChange: (value: string) => void;
  onSend: () => void;
}

const TipModal: React.FC<TipModalProps> = ({
  artistName,
  presetAmounts,
  showMessageField,
  selectedAmount,
  customAmount,
  message,
  error,
  success,
  isSending,
  available_dyo,
  isResolvingAddress = false,
  resolvedArtistAddress = null,
  onClose,
  onAmountSelect,
  onCustomAmountChange,
  onMessageChange,
  onSend
}) => {
  const getFinalAmount = (): number => {
    if (selectedAmount !== null) {
      return selectedAmount;
    }
    const custom = parseFloat(customAmount);
    return isNaN(custom) || custom <= 0 ? 0 : custom;
  };

  const finalAmount = getFinalAmount();

  return (
    <>
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
      />

      {/* Modal */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          className="bg-gray-800 rounded-xl p-6 max-w-md w-full border border-pink-500/30 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {success ? (
            <div className="text-center py-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4"
              >
                <Heart className="w-8 h-8 text-white fill-white" />
              </motion.div>
              <h3 className="text-2xl font-bold text-white mb-2">Tip Sent! 💝</h3>
              <p className="text-gray-400">
                {finalAmount.toFixed(2)} DYO sent to {artistName}
              </p>
            </div>
          ) : (
            <>
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-r from-pink-500 to-rose-500 rounded-full flex items-center justify-center">
                    <Heart className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Support {artistName}</h3>
                    <p className="text-sm text-gray-400">Show your appreciation</p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Balance */}
              <div className="mb-6 p-3 bg-gray-700/50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-400">Available Balance</span>
                  <span className="text-lg font-bold text-amber-400 flex items-center gap-1">
                    <Coins className="w-4 h-4" />
                    {available_dyo.toFixed(2)} DYO
                  </span>
                </div>
              </div>

              {/* Resolving Address Indicator */}
              {isResolvingAddress && (
                <div className="mb-4 p-3 bg-blue-500/20 border border-blue-500/50 rounded-lg flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <p className="text-sm text-blue-400">Finding artist address...</p>
                </div>
              )}

              {/* Address Resolution Error */}
              {!isResolvingAddress && !resolvedArtistAddress && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <p className="text-sm text-red-400">Unable to find artist address. Please try again later.</p>
                </div>
              )}

              {/* Preset Amounts */}
              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-3">Select Amount</label>
                <div className="grid grid-cols-4 gap-2">
                  {presetAmounts.map((amount) => (
                    <button
                      key={amount}
                      onClick={() => onAmountSelect(amount)}
                      disabled={isSending || amount > available_dyo}
                      className={`px-4 py-3 rounded-lg font-semibold transition-all ${
                        selectedAmount === amount
                          ? 'bg-gradient-to-r from-pink-500 to-rose-500 text-white shadow-lg'
                          : amount > available_dyo
                          ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                          : 'bg-gray-700 text-white hover:bg-gray-600'
                      }`}
                    >
                      {amount} DYO
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom Amount */}
              <div className="mb-6">
                <label className="block text-sm text-gray-300 mb-2">Or Enter Custom Amount</label>
                <div className="relative">
                  <input
                    type="number"
                    value={customAmount}
                    onChange={(e) => onCustomAmountChange(e.target.value)}
                    placeholder="0.00"
                    min="0.01"
                    step="0.01"
                    max={available_dyo}
                    disabled={isSending}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 disabled:opacity-50"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">DYO</span>
                </div>
              </div>

              {/* Message Field */}
              {showMessageField && (
                <div className="mb-6">
                  <label className="block text-sm text-gray-300 mb-2">Message (Optional)</label>
                  <textarea
                    value={message}
                    onChange={(e) => onMessageChange(e.target.value)}
                    placeholder="Leave a message for the artist..."
                    maxLength={200}
                    disabled={isSending}
                    rows={3}
                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-pink-500 resize-none disabled:opacity-50"
                  />
                  <p className="text-xs text-gray-500 mt-1">{message.length}/200</p>
                </div>
              )}

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-400" />
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              {/* Summary */}
              {finalAmount > 0 && (
                <div className="mb-6 p-4 bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/30 rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-300">Total</span>
                    <span className="text-2xl font-bold text-white">
                      {finalAmount.toFixed(2)} DYO
                    </span>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  disabled={isSending}
                  className="flex-1 px-4 py-3 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-all disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={onSend}
                  disabled={isSending || finalAmount <= 0 || finalAmount > available_dyo || isResolvingAddress || !resolvedArtistAddress}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg hover:from-pink-600 hover:to-rose-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSending ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-5 h-5" />
                      <span>Send Tip</span>
                    </>
                  )}
                </button>
              </div>
            </>
          )}
        </motion.div>
      </motion.div>
    </>
  );
};

