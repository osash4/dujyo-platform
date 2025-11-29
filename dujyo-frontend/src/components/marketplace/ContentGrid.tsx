//Este componente se encargará de mostrar los contenidos (música, videos, NFTs) en forma de cuadrícula.
import React from 'react';
import { motion } from 'framer-motion';
import { PurchaseButton } from './PurchaseButton';
import { Coins, TrendingUp, Play, Eye, Gamepad2, Music, Video, Sparkles, Award, BarChart3, Zap, Info, Percent } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';

interface ContentItem {
  id: number;
  title: string;
  creator: string;
  imageUrl: string;
  price: number;
  category: string;
  type: string;
  rating: number;
  // Stream-to-Earn fields
  earningPotential?: number;
  earningsPerStream?: number;
  totalEarnings?: number;
  streamCount?: number;
  royaltyShare?: number;
  historicalEarnings?: number[];
  engagementScore?: number;
  licenseTier?: 'personal' | 'commercial' | 'premium';
  isHighEarner?: boolean;
  recentEarnings?: number;
  liveStreamCount?: number;
}

interface ContentGridProps {
  contents: ContentItem[];
  onContentClick: (id: string) => void;
  onPurchaseComplete?: () => void;
}

export const ContentGrid: React.FC<ContentGridProps> = ({ contents, onContentClick, onPurchaseComplete }) => {
  const { t } = useLanguage();
  
  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'music':
        return Music;
      case 'video':
        return Video;
      case 'gaming':
        return Gamepad2;
      default:
        return Play;
    }
  };

  const getEarningBadgeColor = (totalEarnings: number) => {
    if (totalEarnings > 1000) return 'from-amber-500 to-orange-600';
    if (totalEarnings > 500) return 'from-amber-400 to-orange-500';
    return 'from-amber-300 to-orange-400';
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toFixed(0);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {contents.map((content, idx) => {
        const CategoryIcon = getCategoryIcon(content.category);
        const hasEarnings = (content.totalEarnings || 0) > 0;
        const isHighEarner = content.isHighEarner || false;
        
        return (
          <motion.div
          key={content.id}
            className={`card p-4 relative overflow-hidden ${
              isHighEarner ? 'bg-gradient-to-br from-amber-500/10 to-orange-600/10 border-amber-400/30' : ''
            }`}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            whileHover={{ scale: 1.02, y: -5 }}
          >
            {/* High Earner Badge */}
            {isHighEarner && (
              <div className="absolute top-2 right-2 z-10">
                <div className="px-2 py-1 bg-gradient-to-r from-amber-500 to-orange-600 rounded-full text-xs font-bold text-white flex items-center gap-1">
                  <Award className="w-3 h-3" />
                  {t('marketplace.highEarner')}
                </div>
              </div>
            )}

            {/* Earning Potential Badge */}
            {content.earningPotential !== undefined && content.earningPotential > 0 && (
              <div className="absolute top-2 left-2 z-10">
                <div className={`px-2 py-1 bg-gradient-to-r ${getEarningBadgeColor(content.totalEarnings || 0)} rounded-full text-xs font-bold text-white flex items-center gap-1`}>
                  <Coins className="w-3 h-3" />
                  {formatNumber(content.earningPotential)} $DYO
                </div>
              </div>
            )}

            {/* Content Image */}
            <div className="relative mb-4">
          <img 
            src={content.imageUrl} 
            alt={content.title} 
                className="w-full h-48 object-cover rounded-lg" 
              />
              {/* Live Stream Count Overlay */}
              {content.liveStreamCount !== undefined && content.liveStreamCount > 0 && (
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm rounded-lg px-2 py-1 flex items-center gap-1 text-xs text-white">
                  <Play className="w-3 h-3 text-green-400" />
                  <span>{formatNumber(content.liveStreamCount)} live</span>
                </div>
              )}
              {/* Category Icon Overlay */}
              <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm rounded-lg p-2">
                <CategoryIcon className="w-4 h-4 text-white" />
              </div>
            </div>

            {/* Content Info */}
          <h3 className="text-lg font-semibold text-white mb-2">{content.title}</h3>
            <p className="text-sm text-gray-400 mb-3">By {content.creator}</p>

            {/* Earning Metrics */}
            {hasEarnings && (
              <div className="mb-4 p-3 bg-gray-700/30 rounded-lg border border-amber-400/20">
                <div className="grid grid-cols-2 gap-3 mb-2">
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{t('marketplace.totalEarnings')}</p>
                    <p className="text-lg font-bold text-amber-400">{formatNumber(content.totalEarnings || 0)} $DYO</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-400 mb-1">{t('marketplace.perStream')}</p>
                    <p className="text-sm font-semibold text-white">{(content.earningsPerStream || 0).toFixed(3)} $DYO</p>
                  </div>
                </div>
                {content.streamCount !== undefined && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-400">Streams: {formatNumber(content.streamCount)}</span>
                    {content.royaltyShare !== undefined && content.royaltyShare > 0 && (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Percent className="w-3 h-3" />
                        {content.royaltyShare}% {t('marketplace.royalty')}
                      </span>
                    )}
                  </div>
                )}
                {content.recentEarnings !== undefined && content.recentEarnings > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-600/50">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-gray-400">{t('marketplace.recent24h')}</span>
                      <span className="text-green-400 font-semibold">+{content.recentEarnings.toFixed(2)} $DYO</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Engagement Score */}
            {content.engagementScore !== undefined && content.engagementScore > 0 && (
              <div className="mb-4 flex items-center gap-2 text-xs">
                <BarChart3 className="w-4 h-4 text-amber-400" />
                <span className="text-gray-400">{t('marketplace.engagement')}:</span>
                <span className="text-white font-semibold">{content.engagementScore.toFixed(1)}/10</span>
              </div>
            )}

            {/* Price and Rating */}
          <div className="flex items-center justify-between mb-4">
              <span className="text-amber-400 font-bold text-lg">{content.price} $DYO</span>
              <div className="flex items-center gap-2">
              <span className="text-yellow-400 text-sm">⭐ {content.rating}</span>
            </div>
          </div>

            {/* License Tier Badge */}
            {content.licenseTier && content.licenseTier !== 'personal' && (
              <div className="mb-4">
                <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-semibold ${
                  content.licenseTier === 'premium' 
                    ? 'bg-gradient-to-r from-amber-500/20 to-orange-600/20 text-amber-400 border border-amber-400/30'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-400/20'
                }`}>
                  <Sparkles className="w-3 h-3" />
                  {content.licenseTier === 'premium' ? t('marketplace.premiumLicense') : t('marketplace.commercialLicense')}
                </div>
              </div>
            )}

            {/* Action Buttons */}
          <div className="space-y-2">
            <button
              onClick={() => onContentClick(content.id.toString())}
                className="btn-secondary w-full py-2 px-4 text-sm flex items-center justify-center gap-2 min-h-[44px]"
            >
                <Info className="w-4 h-4" />
                {t('marketplace.viewDetails')}
            </button>
            <PurchaseButton 
              content={content} 
              onPurchaseComplete={onPurchaseComplete}
            />
          </div>
          </motion.div>
        );
      })}
    </div>
  );
};
