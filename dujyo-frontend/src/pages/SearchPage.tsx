import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import SimpleAppLayout from '../components/Layout/SimpleAppLayout';
import { usePlayerContext } from '../contexts/PlayerContext';
import { useNavigate } from 'react-router-dom';
import { getApiBaseUrl } from '../utils/apiConfig';
import { Search, Music, Video, Gamepad, User, TrendingUp } from 'lucide-react';
import { searchContent, SearchResult } from '../services/searchService';

interface SearchResult {
  id: string;
  title: string;
  type: 'music' | 'video' | 'gaming' | 'user' | 'playlist';
  description: string;
  image: string;
  url?: string;
  artist?: string;
  duration?: string;
  rating?: number;
}

const SearchPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { playTrack } = usePlayerContext();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<'all' | 'music' | 'video' | 'gaming' | 'users'>('all');

  useEffect(() => {
    const query = searchParams.get('q');
    if (query) {
      setSearchQuery(query);
      performSearch(query);
    }
  }, [searchParams]);

  const performSearch = async (query: string) => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }
    
    setIsLoading(true);
    
    try {
      const response = await searchContent(query, activeFilter === 'all' ? undefined : activeFilter as any);
      setResults(response.results);
    } catch (error) {
      console.error('Search error:', error);
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'music': return <Music className="w-4 h-4" />;
      case 'video': return <Video className="w-4 h-4" />;
      case 'gaming': return <Gamepad className="w-4 h-4" />;
      case 'user': return <User className="w-4 h-4" />;
      case 'playlist': return <TrendingUp className="w-4 h-4" />;
      default: return <Search className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'music': return 'text-orange-400';
      case 'video': return 'text-amber-400';
      case 'gaming': return 'text-green-400';
      case 'user': return 'text-purple-400';
      case 'playlist': return 'text-yellow-400';
      default: return 'text-gray-400';
    }
  };

  const filteredResults = activeFilter === 'all' 
    ? results 
    : results.filter(result => result.type === activeFilter);

  const buildFullUrl = (url?: string) => {
    if (!url) return '';
    if (url.startsWith('http')) return url;
    const apiBaseUrl = getApiBaseUrl();
    return url.startsWith('/') ? `${apiBaseUrl}${url}` : `${apiBaseUrl}/${url}`;
  };

  const isLikelyFileUrl = (u: string) => {
    const lower = u.toLowerCase();
    return lower.includes('/uploads/') || lower.endsWith('.mp3') || lower.endsWith('.wav') || lower.endsWith('.m4a') || lower.endsWith('.ogg');
  };

  const handleResultClick = async (result: SearchResult) => {
    console.log('[SearchPage] Clicked result:', result);
    if (result.type === 'music') {
      let url = buildFullUrl(result.url);
      // If url is missing OR points to a content details path (not a file), resolve the real file_url
      if (!url || url.includes('/content/') || !isLikelyFileUrl(url)) {
        try {
          const apiBaseUrl = getApiBaseUrl();
          const res = await fetch(`${apiBaseUrl}/api/v1/content/public?type=audio&limit=100`);
          const data = await res.json();
          const match = (data.content || []).find((c: any) => c.content_id === result.id || c.title === result.title);
          if (match && match.file_url) {
            url = match.file_url.startsWith('http') ? match.file_url : `${apiBaseUrl}${match.file_url}`;
          }
        } catch (e) {
          console.error('[SearchPage] resolve fallback failed:', e);
        }
      }
      if (!url) return;
      console.log('[SearchPage] Playing URL:', url);
      playTrack({
        id: result.id,
        title: result.title,
        url,
        playerMode: 'music',
        artist: result.artist,
        cover: result.image,
      });
      return;
    }
    if (result.type === 'video') {
      // Navigate to /video and let the page handle playback
      navigate('/video', { state: { autoplay: true, item: result } });
      return;
    }
    if (result.type === 'gaming') {
      navigate('/gaming', { state: { autoplay: true, item: result } });
      return;
    }
    if (result.url) {
      window.open(buildFullUrl(result.url), '_blank');
    }
  };

  return (
    <SimpleAppLayout>
      <div className="min-h-screen bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold mb-4">
              Search Results for "{searchQuery}"
            </h1>
            <p className="text-gray-400">
              {isLoading ? 'Searching...' : `${filteredResults.length} results found`}
            </p>
          </motion.div>

          {/* Filters */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mb-8"
          >
            <div className="flex space-x-2 overflow-x-auto pb-2">
              {[
                { key: 'all', label: 'All' },
                { key: 'music', label: 'Music' },
                { key: 'video', label: 'Video' },
                { key: 'gaming', label: 'Gaming' },
                { key: 'users', label: 'Users' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setActiveFilter(filter.key as any)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                    activeFilter === filter.key
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
            </div>
          </motion.div>

          {/* Results */}
          {isLoading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            >
              {filteredResults.map((result, index) => (
                <motion.div
                  key={result.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="bg-gray-800/50 backdrop-blur-sm rounded-lg p-4 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 cursor-pointer group"
                  onClick={() => handleResultClick(result)}
                >
                  <div className="relative mb-4">
                    <img
                      src={result.image}
                      alt={result.title}
                      className="w-full h-48 object-cover rounded-lg"
                    />
                    {/* ✅ Play overlay for playable types */}
                    {(result.type === 'music' || result.type === 'video' || result.type === 'gaming') && (
                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleResultClick(result); }}
                          className="bg-black/60 hover:bg-black/70 rounded-full p-3 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          aria-label="Play"
                        >
                          <svg width="20" height="20" viewBox="0 0 24 24" fill="white" style={{ marginLeft: 2 }}>
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </button>
                      </div>
                    )}
                    <div className="absolute top-2 left-2 flex items-center space-x-1 bg-black/70 rounded-full px-2 py-1">
                      <span className={getTypeColor(result.type)}>
                        {getTypeIcon(result.type)}
                      </span>
                      <span className="text-xs text-white capitalize">
                        {result.type}
                      </span>
                    </div>
                    {result.rating && (
                      <div className="absolute top-2 right-2 bg-black/70 rounded-full px-2 py-1">
                        <span className="text-xs text-yellow-400">⭐ {result.rating}</span>
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-purple-400 transition-colors">
                      {result.title}
                    </h3>
                    {result.artist && (
                      <p className="text-sm text-gray-400 mb-2">{result.artist}</p>
                    )}
                    <p className="text-sm text-gray-500 mb-3 line-clamp-2">
                      {result.description}
                    </p>
                    {result.duration && (
                      <p className="text-xs text-gray-600">{result.duration}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}

          {!isLoading && filteredResults.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="text-center py-12"
            >
              <Search className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">
                No results found
              </h3>
              <p className="text-gray-500">
                Try searching for something else or check your spelling.
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </SimpleAppLayout>
  );
};

export default SearchPage;
