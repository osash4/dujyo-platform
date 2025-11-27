import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  X,
  BookOpen,
  Video,
  HelpCircle,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  PlayCircle,
  FileText,
  Music,
  Gamepad2,
  Wallet,
  TrendingUp,
  DollarSign,
  Users,
  Shield,
  Zap,
  ArrowRight,
  Globe,
} from 'lucide-react';
import { useTranslation } from '../../utils/i18n';
import { helpCenterArticles } from '../../utils/helpCenterTranslations';
import { LanguageSelector } from './LanguageSelector';

interface HelpArticle {
  id: string;
  title: string;
  category: string;
  content: string;
  videoUrl?: string;
  tags: string[];
  icon?: React.ComponentType<any>;
}

interface HelpCategory {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  articles: HelpArticle[];
}

interface HelpCenterProps {
  onClose?: () => void;
  initialCategory?: string;
  initialSearch?: string;
}

export const HelpCenter: React.FC<HelpCenterProps> = ({
  onClose,
  initialCategory,
  initialSearch = '',
}) => {
  const { language, setLanguage, t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory || null);
  const [selectedArticle, setSelectedArticle] = useState<HelpArticle | null>(null);
  const [showVideo, setShowVideo] = useState(false);

  // Build categories with translations
  const categories: HelpCategory[] = useMemo(() => {
    const getArticle = (id: string) => {
      const article = helpCenterArticles[id];
      if (!article) return null;
      return {
        id,
        title: article.title[language],
        category: id.includes('faq') ? 'faq' : id.includes('multistreaming') || id.includes('nft') ? 'features' : 'getting-started',
        content: article.content[language],
        tags: [],
        icon: id.includes('song') ? Music : id.includes('video') ? Video : id.includes('royalties') ? DollarSign : id.includes('dex') ? Wallet : id.includes('staking') ? TrendingUp : id.includes('nft') ? Shield : FileText,
      };
    };

    return [
      {
        id: 'getting-started',
        name: t('category.gettingStarted'),
        icon: Zap,
        articles: [
          getArticle('first-song'),
          getArticle('first-video'),
          getArticle('earn-royalties'),
          getArticle('use-dex'),
          getArticle('staking-tokens'),
        ].filter(Boolean) as HelpArticle[],
      },
      {
        id: 'features',
        name: t('category.features'),
        icon: Zap,
        articles: [
          getArticle('multistreaming'),
          getArticle('nft-licenses'),
        ].filter(Boolean) as HelpArticle[],
      },
      {
        id: 'faq',
        name: t('category.faq'),
        icon: HelpCircle,
        articles: [
          getArticle('faq-general'),
          getArticle('faq-technical'),
        ].filter(Boolean) as HelpArticle[],
      },
    ];
  }, [language, t]);

  const filteredArticles = useMemo(() => {
    let articles: HelpArticle[] = [];

    if (selectedCategory) {
      const category = categories.find(c => c.id === selectedCategory);
      if (category) {
        articles = category.articles;
      }
    } else {
      articles = categories.flatMap(c => c.articles);
    }

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      articles = articles.filter(
        article =>
          article.title.toLowerCase().includes(query) ||
          article.content.toLowerCase().includes(query) ||
          article.tags.some(tag => tag.toLowerCase().includes(query))
      );
    }

    return articles;
  }, [selectedCategory, searchQuery, categories]);

  const handleArticleSelect = (article: HelpArticle) => {
    setSelectedArticle(article);
    if (article.videoUrl) {
      setShowVideo(true);
    }
  };

  const handleBack = () => {
    if (selectedArticle) {
      setSelectedArticle(null);
      setShowVideo(false);
    } else {
      setSelectedCategory(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-opacity-95 backdrop-blur-sm flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0, 0, 0, 0.95)' }}>
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-800 rounded-2xl shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div className="flex items-center gap-3">
            <div 
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}
            >
              <HelpCircle className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">{t('helpCenter.title')}</h2>
              <p className="text-sm text-gray-400">{t('helpCenter.subtitle')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSelector position="header" />
            {onClose && (
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          {!selectedArticle && (
            <div className="w-64 p-4 overflow-y-auto" style={{ backgroundColor: 'var(--bg-card)' }}>
              {/* Search */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder={t('helpCenter.search')}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Categories */}
              <div className="space-y-2">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                    selectedCategory === null
                      ? 'text-white'
                      : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                  }`}
                  style={selectedCategory === null ? { background: 'linear-gradient(135deg, #F59E0B, #EA580C)' } : {}}
                >
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4" />
                    <span>{t('helpCenter.all')}</span>
                  </div>
                </button>

                {categories.map((category) => {
                  const Icon = category.icon;
                  return (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                        selectedCategory === category.id
                          ? 'text-white'
                          : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      }`}
                      style={selectedCategory === category.id ? { background: 'linear-gradient(135deg, #F59E0B, #EA580C)' } : {}}
                    >
                      <div className="flex items-center gap-2">
                        <Icon className="w-4 h-4" />
                        <span>{category.name}</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {selectedArticle ? (
              <div>
                <button
                  onClick={handleBack}
                  className="mb-4 text-purple-400 hover:text-purple-300 flex items-center gap-2 transition-colors"
                >
                  <ArrowRight className="w-4 h-4 rotate-180" />
                  {t('helpCenter.back')}
                </button>

                <div className="prose prose-invert max-w-none">
                  <h1 className="text-3xl font-bold text-white mb-4">{selectedArticle.title}</h1>
                  <div className="text-gray-300 whitespace-pre-wrap">{selectedArticle.content}</div>
                </div>

                {selectedArticle.videoUrl && (
                  <div className="mt-6">
                    <button
                      onClick={() => setShowVideo(!showVideo)}
                      className="btn-primary flex items-center gap-2 px-4 py-2 rounded-lg transition-colors"
                    >
                      <PlayCircle className="w-5 h-5" />
                      {showVideo ? t('helpCenter.hideVideo') : t('helpCenter.showVideo')} {t('helpCenter.videoTutorial')}
                    </button>
                    {showVideo && (
                      <div className="mt-4">
                        <iframe
                          src={selectedArticle.videoUrl}
                          className="w-full h-96 rounded-lg"
                          allowFullScreen
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <h2 className="text-2xl font-bold text-white mb-6">
                  {selectedCategory
                    ? categories.find(c => c.id === selectedCategory)?.name
                    : t('helpCenter.all') + ' ' + (language === 'en' ? 'Articles' : 'Artículos')}
                </h2>

                {filteredArticles.length === 0 ? (
                  <div className="text-center py-12">
                    <HelpCircle className="w-16 h-16 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">{t('helpCenter.noArticles')}</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {filteredArticles.map((article) => {
                      const Icon = article.icon || FileText;
                      return (
                        <motion.div
                          key={article.id}
                          whileHover={{ scale: 1.02 }}
                          onClick={() => handleArticleSelect(article)}
                          className="bg-gray-800 p-6 rounded-xl cursor-pointer hover:bg-gray-700 transition-colors border border-gray-700"
                        >
                          <div className="flex items-start gap-4">
                            <div 
                              className="w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0"
                              style={{ background: 'linear-gradient(135deg, #F59E0B, #EA580C)' }}
                            >
                              <Icon className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1">
                              <h3 className="text-lg font-semibold text-white mb-2">
                                {article.title}
                              </h3>
                              <p className="text-sm text-gray-400 line-clamp-2">
                                {article.content.substring(0, 100)}...
                              </p>
                              <div className="flex items-center gap-2 mt-3">
                                <ChevronRight className="w-4 h-4 text-purple-400" />
                                <span className="text-sm text-purple-400">{t('helpCenter.readMore')}</span>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default HelpCenter;

