//Este componente será una vista para listar NFTs disponibles en el mercado.
import React from 'react';
import { motion } from 'framer-motion';
import { Coins, Sparkles, Percent, TrendingUp, Award } from 'lucide-react';
import { useUnifiedBalance } from '../../hooks/useUnifiedBalance';

interface NFTItem {
  id: string;
  name: string;
  creator: string;
  price: string | number;
  imageUrl: string;
  streamingRights?: boolean;
  royaltyPercentage?: number;
  totalEarnings?: number;
}

interface NFTMarketProps {
  nfts: NFTItem[];
  onBuy?: (id: string) => void;
  showStreamingRights?: boolean;
}

export const NFTMarket: React.FC<NFTMarketProps> = ({ nfts, onBuy, showStreamingRights = false }) => {
  // ✅ USAR HOOK UNIFICADO
  const { available_dyo, dys, isUpdating } = useUnifiedBalance();
  
  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(2);
  };

  const handleBuy = (id: string) => {
    if (onBuy) {
      onBuy(id);
    } else {
      console.log('Buy NFT:', id);
    }
  };
  
  return (
    <div className="space-y-6">
      {/* ✅ BALANCE DISPLAY */}
      <motion.div
        className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-6 border border-gray-700/50"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex items-center gap-3 mb-2">
          <Coins className="text-amber-400" size={24} />
          <h3 className="text-white font-semibold text-lg">Available Balance</h3>
        </div>
        <p className="text-3xl font-bold text-amber-400">
          {available_dyo.toLocaleString()} DYO
        </p>
        {dys > 0 && (
          <p className="text-gray-400 mt-1">
            {dys.toLocaleString()} DYS
          </p>
        )}
        {isUpdating && (
          <p className="text-gray-500 text-sm mt-2">Updating...</p>
        )}
      </motion.div>

      {/* Streaming Rights Info */}
      {showStreamingRights && (
        <motion.div
          className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border border-amber-400/30 rounded-lg p-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center gap-3 mb-3">
            <Sparkles className="w-6 h-6 text-amber-400" />
            <h3 className="text-xl font-bold text-white">Streaming Rights Marketplace</h3>
          </div>
          <p className="text-gray-300 mb-4">
            Trade streaming rights as NFTs. Own content with proven earnings and receive automated royalty distributions.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Secondary Market</p>
              <p className="text-lg font-bold text-amber-400">Active</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Royalty Automation</p>
              <p className="text-lg font-bold text-amber-400">Enabled</p>
            </div>
            <div className="bg-gray-800/50 rounded-lg p-4">
              <p className="text-sm text-gray-400 mb-1">Proven Earnings</p>
              <p className="text-lg font-bold text-amber-400">Verified</p>
            </div>
      </div>
        </motion.div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {nfts.map((nft, idx) => (
        <motion.div
          key={nft.id}
          className={`border rounded-xl shadow-lg p-4 bg-gray-800/50 backdrop-blur-sm ${
            nft.streamingRights ? 'border-amber-400/30 bg-gradient-to-br from-amber-500/5 to-orange-600/5' : 'border-gray-700/50'
          }`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: idx * 0.1 }}
          whileHover={{ scale: 1.02, y: -5 }}
        >
          {/* Streaming Rights Badge */}
          {nft.streamingRights && (
            <div className="absolute top-2 right-2 z-10">
              <div className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full text-xs font-bold text-white flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                Streaming Rights
              </div>
            </div>
          )}

          <div className="relative">
            <img 
              src={nft.imageUrl} 
              alt={nft.name} 
              className="w-full h-40 object-cover rounded-lg mb-3" 
            />
            {nft.totalEarnings !== undefined && nft.totalEarnings > 0 && (
              <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1">
                <p className="text-xs text-white font-semibold">
                  {formatNumber(nft.totalEarnings)} $DYO earned
                </p>
              </div>
            )}
          </div>

          <h3 className="mt-2 text-lg font-bold text-white">{nft.name}</h3>
          <p className="text-sm text-gray-400 mb-3">By {nft.creator}</p>

          {/* Earnings Info */}
          {nft.totalEarnings !== undefined && nft.totalEarnings > 0 && (
            <div className="mb-3 p-3 bg-gray-700/30 rounded-lg border border-amber-400/20">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1 text-xs text-gray-400">
                  <TrendingUp className="w-3 h-3" />
                  <span>Total Earnings</span>
                </div>
                <p className="text-lg font-bold text-amber-400">{formatNumber(nft.totalEarnings)} $DYO</p>
              </div>
              {nft.royaltyPercentage !== undefined && nft.royaltyPercentage > 0 && (
                <div className="flex items-center gap-1 text-xs text-amber-400">
                  <Percent className="w-3 h-3" />
                  <span>{nft.royaltyPercentage}% Royalty Share</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <p className="text-xl font-bold text-amber-400">
              {typeof nft.price === 'number' ? `${nft.price} $DYO` : nft.price}
            </p>
            {nft.streamingRights && (
              <Award className="w-5 h-5 text-amber-400" />
            )}
          </div>

          <button
            onClick={() => handleBuy(nft.id)}
            className="w-full bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2 px-4 rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all duration-300 font-semibold min-h-[44px]"
          >
            Buy Now
          </button>
        </motion.div>
      ))}
      </div>
    </div>
  );
};
