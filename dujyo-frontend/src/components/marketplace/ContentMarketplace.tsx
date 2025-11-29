import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBlockchain } from '../../contexts/BlockchainContext';
import { useAuth } from '../../auth/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { ContentGrid } from './ContentGrid';
import { NFTMarket } from './NFTMarket';
import { LicenseStore } from './LicenseStore';
import { FilterPanel } from '../common/FilterPanel';
import { ReviewSystem } from './ReviewSystem';
import { ShoppingBag, Package, FileText, Search, Coins, TrendingUp, Award, Calculator, BarChart3, Users, Sparkles, Zap, Crown, Percent, Target, ArrowRight, Info, Play, Eye, Gamepad2, Music, Video } from 'lucide-react';
import SimpleAppLayout from '../Layout/SimpleAppLayout';
import { getApiBaseUrl } from '../../utils/apiConfig';

// Enhanced interfaces with Stream-to-Earn data
interface FilterOptions {
  category: string;
  priceRange: string;
  contentType: string;
  rating: string;
  earningPotential?: string;
}

interface Content {
  id: number;
  title: string;
  creator: string;
  creatorId?: string;
  category: string;
  type: string;
  price: number;
  rating: number;
  imageUrl: string;
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

interface NFT {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  creator: string;
  streamingRights?: boolean;
  royaltyPercentage?: number;
  totalEarnings?: number;
}

interface TopCreator {
  id: string;
  name: string;
  totalEarnings: number;
  contentCount: number;
  verified: boolean;
  avatar?: string;
  category: string;
}

interface LicenseTier {
  id: string;
  name: string;
  price: number;
  royaltyShare: number;
  features: string[];
  earningPotential: number;
  color: string;
}

interface EarningProjection {
  expectedStreams: number;
  audienceSize: number;
  contentType: string;
  projectedEarnings: number;
  roi: number;
  breakEvenStreams: number;
}

export function ContentMarketplace(): JSX.Element {
  const { contentManager, nftPallet, account } = useBlockchain();
  const { user, getUserRole } = useAuth();
  const { t } = useLanguage();
  const [contents, setContents] = useState<Content[]>([]);
  const [nfts, setNfts] = useState<NFT[]>([]);
  const [activeTab, setActiveTab] = useState<'content' | 'nft' | 'licenses'>('content');
  const [filters, setFilters] = useState<FilterOptions>({
    category: 'all',
    priceRange: 'all',
    contentType: 'all',
    rating: 'all',
    earningPotential: 'all'
  });
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [purchaseMessage, setPurchaseMessage] = useState<string>('');
  const [isPurchasing, setIsPurchasing] = useState<boolean>(false);
  const [selectedContent, setSelectedContent] = useState<Content | null>(null);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [showEarningCalculator, setShowEarningCalculator] = useState(false);
  const [earningProjection, setEarningProjection] = useState<EarningProjection | null>(null);
  const [licenseTiers, setLicenseTiers] = useState<LicenseTier[]>([]);
  const [selectedLicenseTier, setSelectedLicenseTier] = useState<string | null>(null);

  // Initialize license tiers - use useMemo to ensure t is available
  const licenseTiersData = React.useMemo(() => [
      {
        id: 'personal',
      name: t('marketplace.personalUse'),
        price: 0,
        royaltyShare: 0,
      features: [t('marketplace.basicStreamingRights'), t('marketplace.noCommercialUse'), t('marketplace.personalListening')],
        earningPotential: 0,
        color: '#6B7280'
      },
      {
        id: 'commercial',
      name: t('marketplace.commercialLicense'),
        price: 50,
        royaltyShare: 5,
      features: [t('marketplace.commercialStreamingRights'), `5% ${t('marketplace.royaltySharePercent')}`, t('marketplace.contentMonetization'), t('marketplace.analyticsAccess')],
        earningPotential: 0.05,
        color: '#F59E0B'
      },
      {
        id: 'premium',
      name: t('marketplace.premiumLicense'),
        price: 150,
        royaltyShare: 10,
      features: [t('marketplace.fullCommercialRights'), `10% ${t('marketplace.royaltySharePercent')}`, t('marketplace.prioritySupport'), t('marketplace.advancedAnalytics'), t('marketplace.contentPromotion'), t('marketplace.nftMintingRights')],
        earningPotential: 0.10,
        color: '#EA580C'
      }
  ], [t]);

  // Initialize license tiers
  useEffect(() => {
    setLicenseTiers(licenseTiersData);
  }, [licenseTiersData]);

  useEffect(() => {
    loadMarketplaceData();
    loadTopCreators();
  }, []);

  // Real-time earnings updates
  useEffect(() => {
    const interval = setInterval(() => {
      updateContentEarnings();
    }, 5000); // Update every 5 seconds

    return () => clearInterval(interval);
  }, [contents]);

  async function loadMarketplaceData() {
    try {
      const availableContent = await contentManager.listContent();
      const availableNFTs = account ? await nftPallet.getNFTs(account) : [];

      // Fetch streaming analytics for each content
      const formattedContent: Content[] = await Promise.all(
        availableContent.map(async (item: Record<string, unknown>) => {
          const contentId = item.id as number;
          const earningsData = await fetchContentEarnings(contentId);
          
          return {
            id: contentId,
        title: item.title as string,
        creator: item.creator as string,
            creatorId: item.creatorId as string,
        category: item.category as string,
        type: item.type as string,
        price: item.price as number,
        rating: item.rating as number,
        imageUrl: item.imageUrl ? item.imageUrl as string : 'default-image-url.jpg',
            // Stream-to-Earn data
            earningPotential: earningsData.earningPotential || 0,
            earningsPerStream: earningsData.earningsPerStream || 0.01,
            totalEarnings: earningsData.totalEarnings || 0,
            streamCount: earningsData.streamCount || 0,
            royaltyShare: earningsData.royaltyShare || 0,
            historicalEarnings: earningsData.historicalEarnings || [],
            engagementScore: earningsData.engagementScore || 0,
            licenseTier: (item.licenseTier as any) || 'personal',
            isHighEarner: earningsData.totalEarnings > 1000,
            recentEarnings: earningsData.recentEarnings || 0,
            liveStreamCount: earningsData.liveStreamCount || 0
          };
        })
      );

      setContents(formattedContent);

      const formattedNFTs: NFT[] = availableNFTs.map((nft: Record<string, unknown>) => ({
        id: nft.id as number,
        name: nft.name as string,
        price: nft.price as number,
        creator: nft.creator as string,
        imageUrl: nft.imageUrl ? nft.imageUrl as string : 'default-nft-image-url.jpg',
        streamingRights: nft.streamingRights as boolean || false,
        royaltyPercentage: nft.royaltyPercentage as number || 0,
        totalEarnings: nft.totalEarnings as number || 0
      }));

      setNfts(formattedNFTs);
    } catch (error) {
      console.error('Error loading marketplace data:', error);
      // Set mock data with Stream-to-Earn features
      setContents([
        {
          id: 1,
          title: "Cyberpunk Music Pack",
          creator: "NeonBeats",
          category: "music",
          type: "download",
          price: 25,
          rating: 4.8,
          imageUrl: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop",
          earningPotential: 500,
          earningsPerStream: 0.05,
          totalEarnings: 1250,
          streamCount: 25000,
          royaltyShare: 5,
          engagementScore: 8.5,
          licenseTier: 'commercial',
          isHighEarner: true,
          recentEarnings: 45,
          liveStreamCount: 1250
        }
      ]);
      setNfts([
        {
          id: 1,
          name: "Digital Art #001",
          price: 0.5,
          imageUrl: "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop",
          creator: "CryptoArtist",
          streamingRights: true,
          royaltyPercentage: 10,
          totalEarnings: 500
        }
      ]);
    }
  }

  async function fetchContentEarnings(contentId: number) {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/content/${contentId}/earnings`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error('Error fetching content earnings:', error);
    }
    
    // Default values
    return {
      earningPotential: 0,
      earningsPerStream: 0.01,
      totalEarnings: 0,
      streamCount: 0,
      royaltyShare: 0,
      historicalEarnings: [],
      engagementScore: 0,
      recentEarnings: 0,
      liveStreamCount: 0
    };
  }

  async function loadTopCreators() {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/creators/top-earners`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('jwt_token')}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setTopCreators(data.creators || []);
      } else {
        // Mock data
        setTopCreators([
          {
            id: '1',
            name: 'NeonBeats',
            totalEarnings: 12500,
            contentCount: 45,
            verified: true,
            category: 'music'
          },
          {
            id: '2',
            name: 'VisualFlow',
            totalEarnings: 9800,
            contentCount: 32,
            verified: true,
            category: 'video'
          },
          {
            id: '3',
            name: 'GameMaster',
            totalEarnings: 7500,
            contentCount: 28,
            verified: false,
            category: 'gaming'
          }
        ]);
      }
    } catch (error) {
      console.error('Error loading top creators:', error);
    }
  }

  async function updateContentEarnings() {
    // Update live stream counts and recent earnings
    const updatedContents = await Promise.all(
      contents.map(async (content) => {
        const earnings = await fetchContentEarnings(content.id);
        return {
          ...content,
          liveStreamCount: earnings.liveStreamCount || content.liveStreamCount || 0,
          recentEarnings: earnings.recentEarnings || content.recentEarnings || 0
        };
      })
    );
    setContents(updatedContents);
  }

  const calculateEarningProjection = (content: Content, expectedStreams: number, audienceSize: number) => {
    const baseEarningPerStream = content.earningsPerStream || 0.01;
    const engagementMultiplier = content.engagementScore ? content.engagementScore / 10 : 1;
    const audienceMultiplier = Math.min(audienceSize / 1000, 2); // Cap at 2x
    
    const projectedEarnings = expectedStreams * baseEarningPerStream * engagementMultiplier * audienceMultiplier;
    const roi = content.price > 0 ? ((projectedEarnings - content.price) / content.price) * 100 : 0;
    const breakEvenStreams = content.price > 0 ? Math.ceil(content.price / (baseEarningPerStream * engagementMultiplier)) : 0;
    
    return {
      expectedStreams,
      audienceSize,
      contentType: content.type,
      projectedEarnings,
      roi,
      breakEvenStreams
    };
  };

  const filteredContent = contents.filter(content => {
    const matchesSearch = content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         content.creator.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = filters.category === 'all' || content.category === filters.category;
    const matchesType = filters.contentType === 'all' || content.type === filters.contentType;
    const matchesPrice = filters.priceRange === 'all' || 
                        (filters.priceRange === 'high' ? content.price > 100 : content.price <= 100);
    const matchesRating = filters.rating === 'all' || content.rating >= parseInt(filters.rating);
    const matchesEarning = !filters.earningPotential || filters.earningPotential === 'all' ||
                          (filters.earningPotential === 'high' ? (content.totalEarnings || 0) > 500 : true);
    
    return matchesSearch && matchesCategory && matchesType && matchesPrice && matchesRating && matchesEarning;
  });

  const tabs = React.useMemo(() => [
    {
      id: 'content',
      label: t('marketplace.content'),
      icon: ShoppingBag,
      color: '#00F5FF',
      description: t('marketplace.digitalContent')
    },
    {
      id: 'nft',
      label: t('marketplace.nft'),
      icon: Package,
      color: '#EA580C',
      description: t('marketplace.nftsCollectibles')
    },
    {
      id: 'licenses',
      label: t('marketplace.licenses'),
      icon: FileText,
      color: '#F59E0B',
      description: t('marketplace.contentLicenses')
    }
  ], [t]);

  return (
    <SimpleAppLayout>
      <div className="min-h-screen bg-gray-900 text-white">
        {/* Hero Section */}
        <motion.div
          className="relative overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8 }}
        >
          {/* Animated Background */}
          <div className="absolute inset-0">
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
            <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-500/10" />
            <motion.div
              className="absolute inset-0"
              animate={{
                background: [
                  'radial-gradient(circle at 20% 50%, rgba(0, 245, 255, 0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 80% 50%, rgba(245, 158, 11, 0.1) 0%, transparent 50%)',
                  'radial-gradient(circle at 20% 50%, rgba(0, 245, 255, 0.1) 0%, transparent 50%)'
                ]
              }}
              transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          {/* Hero Content */}
          <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
            <div className="text-center">
              <motion.h1
                className="text-4xl md:text-6xl font-bold mb-6"
                initial={{ opacity: 0, y: -50 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, delay: 0.2 }}
              >
                <span className="bg-gradient-to-r from-amber-400 via-blue-500 to-orange-600 bg-clip-text text-transparent">
                  {t('marketplace.content')}
                </span>
                <motion.span
                  className="ml-4 text-4xl md:text-6xl"
                  animate={{
                    textShadow: [
                      '0 0 20px #F59E0B',
                      '0 0 40px #F59E0B, 0 0 60px #F59E0B',
                      '0 0 20px #F59E0B'
                    ]
                  }}
                  transition={{ duration: 2, repeat: Infinity }}
                >
                  {t('marketplace.title')}
                </motion.span>
              </motion.h1>

              <motion.p
                className="text-xl text-gray-300 max-w-2xl mx-auto mb-8"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
              >
                {t('marketplace.subtitle')}
              </motion.p>

              {/* Search Bar */}
              <motion.div
                className="max-w-md mx-auto"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, delay: 0.7 }}
              >
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder={t('marketplace.searchPlaceholder')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 bg-gray-800/50 backdrop-blur-sm border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:outline-none focus:border-amber-400/50 focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Top Earning Creators Section */}
        {topCreators.length > 0 && (
          <motion.div
            className="bg-gradient-to-r from-amber-500/10 to-orange-600/10 border-y border-amber-400/30 py-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Crown className="w-6 h-6 text-amber-400" />
                  {t('marketplace.topCreators')}
                </h2>
                <div className="flex items-center gap-2 text-sm text-amber-400">
                  <Sparkles className="w-4 h-4" />
                  <span>{t('marketplace.streamToEarnActive')}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {topCreators.slice(0, 3).map((creator, idx) => (
                  <motion.div
                    key={creator.id}
                    className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 + idx * 0.1 }}
                    whileHover={{ scale: 1.02 }}
                  >
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-r from-amber-500 to-orange-600 flex items-center justify-center text-white font-bold">
                        {creator.name.charAt(0)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white">{creator.name}</h3>
                          {creator.verified && (
                            <div className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded-full text-xs font-semibold flex items-center gap-1">
                              <Award className="w-3 h-3" />
                              {t('marketplace.verifiedHighEarner')}
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-400">{creator.contentCount} {t('marketplace.items')}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs text-gray-400">{t('marketplace.totalEarnings')}</p>
                        <p className="text-xl font-bold text-amber-400">{creator.totalEarnings.toFixed(2)} $DYO</p>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        {creator.category === 'music' && <Music className="w-4 h-4" />}
                        {creator.category === 'video' && <Video className="w-4 h-4" />}
                        {creator.category === 'gaming' && <Gamepad2 className="w-4 h-4" />}
                        <span className="capitalize">{creator.category}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Navigation Tabs */}
        <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex justify-center space-x-2 py-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative flex flex-col items-center gap-2 py-4 px-6 rounded-xl font-medium text-sm transition-all duration-300 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {/* Active Background */}
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, ${tab.color}20, transparent)`,
                          border: `2px solid ${tab.color}`,
                          boxShadow: `0 0 20px ${tab.color}50`
                        }}
                        layoutId="activeTab"
                        transition={{ duration: 0.3 }}
                      />
                    )}

                    {/* Content */}
                    <div className="relative z-10 flex flex-col items-center gap-2">
                      <Icon
                        size={20}
                        style={{ color: isActive ? tab.color : undefined }}
                      />
                      <span className="font-semibold">{tab.label}</span>
                      <span className="text-xs opacity-75">{tab.description}</span>
                    </div>
                  </motion.button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Earning Calculator Modal */}
          <AnimatePresence>
            {showEarningCalculator && selectedContent && (
              <motion.div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setShowEarningCalculator(false)}
              >
                <motion.div
                  className="bg-gray-800 rounded-xl p-8 max-w-2xl w-full border border-amber-400/30"
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-2xl font-bold text-white flex items-center gap-2">
                      <Calculator className="w-6 h-6 text-amber-400" />
                      {t('marketplace.earningCalculator')}
                    </h3>
                    <button
                      onClick={() => setShowEarningCalculator(false)}
                      className="text-gray-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                  <EarningCalculator
                    content={selectedContent}
                    onCalculate={(projection) => {
                      setEarningProjection(projection);
                    }}
                  />
                  {earningProjection && (
                    <motion.div
                      className="mt-6 p-6 bg-gradient-to-r from-amber-500/20 to-orange-600/20 rounded-lg border border-amber-400/30"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                    >
                      <h4 className="font-bold text-white mb-4">{t('marketplace.projectionResults')}</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-gray-400">{t('marketplace.projectedEarnings')}</p>
                          <p className="text-2xl font-bold text-amber-400">{earningProjection.projectedEarnings.toFixed(2)} $DYO</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">{t('marketplace.roi')}</p>
                          <p className={`text-2xl font-bold ${earningProjection.roi > 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {earningProjection.roi > 0 ? '+' : ''}{earningProjection.roi.toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">{t('marketplace.breakEvenStreams')}</p>
                          <p className="text-xl font-semibold text-white">{earningProjection.breakEvenStreams}</p>
                        </div>
                        <div>
                          <p className="text-sm text-gray-400">{t('marketplace.expectedStreams')}</p>
                          <p className="text-xl font-semibold text-white">{earningProjection.expectedStreams}</p>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {activeTab === 'content' && (
              <>
                {/* Streaming License Tiers Section */}
                <motion.div
                  className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 mb-8"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
                    <FileText className="w-6 h-6 text-amber-400" />
                    {t('marketplace.streamingLicenseTiers')}
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {licenseTiers.map((tier) => (
                      <motion.div
                        key={tier.id}
                        className={`bg-gray-700/30 rounded-xl p-6 border-2 ${
                          selectedLicenseTier === tier.id ? 'border-amber-400' : 'border-gray-600'
                        }`}
                        whileHover={{ scale: 1.02 }}
                        onClick={() => setSelectedLicenseTier(tier.id)}
                      >
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-lg font-bold text-white">{tier.name}</h3>
                          <div className="px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: `${tier.color}20`, color: tier.color }}>
                            {tier.royaltyShare}% {t('marketplace.royalty')}
                          </div>
                        </div>
                        <div className="mb-4">
                          <p className="text-3xl font-bold text-amber-400 mb-1">
                            {tier.price === 0 ? 'Free' : `${tier.price} $DYO`}
                          </p>
                          <p className="text-sm text-gray-400">{t('marketplace.earningPotential')}: {tier.earningPotential > 0 ? `${(tier.earningPotential * 100).toFixed(0)}%` : t('marketplace.none')}</p>
                        </div>
                        <ul className="space-y-2 mb-4">
                          {tier.features.map((feature, idx) => (
                            <li key={idx} className="flex items-start gap-2 text-sm text-gray-300">
                              <Zap className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                        {tier.price > 0 && (
                          <button className="w-full py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-lg hover:from-amber-400 hover:to-orange-500 transition-all">
                            {t('marketplace.selectLicense')}
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </div>
                </motion.div>

                <ContentGrid 
                  contents={filteredContent}
                  onContentClick={(id) => {
                    const content = contents.find(c => c.id.toString() === id);
                    setSelectedContent(content || null);
                    setShowEarningCalculator(true);
                  }}
                  onPurchaseComplete={loadMarketplaceData}
                />
                {selectedContent && (
                  <ReviewSystem
                    contentId={selectedContent.id}
                    onReviewSubmitted={loadMarketplaceData}
                  />
                )}
              </>
            )}
            {activeTab === 'nft' && (
              <NFTMarket 
                nfts={nfts}
                showStreamingRights={true}
              />
            )}
            {activeTab === 'licenses' && (
              <LicenseStore 
                licenses={licenseTiers.map(tier => ({
                  id: tier.id,
                  name: tier.name,
                  price: tier.price,
                  features: tier.features,
                  royaltyShare: tier.royaltyShare
                }))} 
                onPurchase={(id: string) => {
                  console.log('License purchased:', id);
                }} 
              />
            )}
          </motion.div>
        </div>
      </div>
    </SimpleAppLayout>
  );
}

// Earning Calculator Component
interface EarningCalculatorProps {
  content: Content;
  onCalculate: (projection: EarningProjection) => void;
}

function EarningCalculator({ content, onCalculate }: EarningCalculatorProps) {
  const { t } = useLanguage();
  const [expectedStreams, setExpectedStreams] = useState(1000);
  const [audienceSize, setAudienceSize] = useState(5000);

  useEffect(() => {
    const projection = calculateEarningProjection(content, expectedStreams, audienceSize);
    onCalculate(projection);
  }, [expectedStreams, audienceSize, content, onCalculate]);

  const calculateEarningProjection = (content: Content, expectedStreams: number, audienceSize: number): EarningProjection => {
    const baseEarningPerStream = content.earningsPerStream || 0.01;
    const engagementMultiplier = content.engagementScore ? content.engagementScore / 10 : 1;
    const audienceMultiplier = Math.min(audienceSize / 1000, 2);
    
    const projectedEarnings = expectedStreams * baseEarningPerStream * engagementMultiplier * audienceMultiplier;
    const roi = content.price > 0 ? ((projectedEarnings - content.price) / content.price) * 100 : 0;
    const breakEvenStreams = content.price > 0 ? Math.ceil(content.price / (baseEarningPerStream * engagementMultiplier)) : 0;
    
    return {
      expectedStreams,
      audienceSize,
      contentType: content.type,
      projectedEarnings,
      roi,
      breakEvenStreams
    };
  };

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm text-gray-300 mb-2">{t('marketplace.expectedStreams')}</label>
        <input
          type="number"
          value={expectedStreams}
          onChange={(e) => setExpectedStreams(Number(e.target.value))}
          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-400"
          min="1"
        />
      </div>
      <div>
        <label className="block text-sm text-gray-300 mb-2">{t('marketplace.audienceSize')}</label>
        <input
          type="number"
          value={audienceSize}
          onChange={(e) => setAudienceSize(Number(e.target.value))}
          className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-400"
          min="1"
        />
      </div>
      <div className="p-4 bg-gray-700/30 rounded-lg">
        <p className="text-sm text-gray-400 mb-2">{t('marketplace.contentInfo')}</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-gray-500">{t('marketplace.earningsPerStream')}</p>
            <p className="text-lg font-semibold text-amber-400">{(content.earningsPerStream || 0.01).toFixed(3)} $DYO</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">{t('marketplace.engagementScore')}</p>
            <p className="text-lg font-semibold text-white">{content.engagementScore?.toFixed(1) || 'N/A'}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
