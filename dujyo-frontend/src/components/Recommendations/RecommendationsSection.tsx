import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Music, Video, Gamepad, TrendingUp, Clock, Heart } from 'lucide-react';
import { getMixedRecommendations, Recommendation } from '../../services/recommendationsService';
import { usePlayerContext } from '../../contexts/PlayerContext';
import { useNavigate } from 'react-router-dom';

interface RecommendationsSectionProps {
  title?: string;
  limit?: number;
  showReason?: boolean;
}

const RecommendationsSection: React.FC<RecommendationsSectionProps> = ({
  title = 'Recommended for You',
  limit = 12,
  showReason = true,
}) => {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const { playTrack } = usePlayerContext();
  const navigate = useNavigate();

  useEffect(() => {
    loadRecommendations();
  }, [limit]);

  const loadRecommendations = async () => {
    try {
      setLoading(true);
      const response = await getMixedRecommendations(limit);
      setRecommendations(response.recommendations);
    } catch (error) {
      console.error('Error loading recommendations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlay = (rec: Recommendation) => {
    playTrack({
      id: rec.id,
      title: rec.title,
      artist: rec.artist || 'Unknown Artist',
      url: '', // Will be loaded from content
      cover: rec.image || '',
      playerMode: rec.type === 'music' ? 'music' : rec.type === 'video' ? 'video' : 'gaming',
      genre: undefined,
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'music':
        return <Music className="w-4 h-4" />;
      case 'video':
        return <Video className="w-4 h-4" />;
      case 'gaming':
        return <Gamepad className="w-4 h-4" />;
      case 'playlist':
        return <TrendingUp className="w-4 h-4" />;
      default:
        return <Music className="w-4 h-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'music':
        return 'from-amber-500 to-orange-600';
      case 'video':
        return 'from-cyan-500 to-blue-600';
      case 'gaming':
        return 'from-green-500 to-emerald-600';
      case 'playlist':
        return 'from-purple-500 to-pink-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold text-white">{title}</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
          {[...Array(limit)].map((_, i) => (
            <div
              key={i}
              className="bg-gray-800 rounded-lg aspect-square animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-amber-400" />
          {title}
        </h2>
        <button
          onClick={loadRecommendations}
          className="text-sm text-gray-400 hover:text-amber-400 transition-colors"
        >
          Refresh
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
        {recommendations.map((rec, index) => (
          <motion.div
            key={rec.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="group cursor-pointer"
            onClick={() => {
              if (rec.type === 'playlist') {
                navigate(`/playlist/${rec.id}`);
              } else {
                handlePlay(rec);
              }
            }}
          >
            <div className="relative aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-gray-800 to-gray-900 mb-2">
              {rec.image ? (
                <img
                  src={rec.image}
                  alt={rec.title}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${getTypeColor(rec.type)} flex items-center justify-center`}>
                  {getTypeIcon(rec.type)}
                </div>
              )}
              
              {/* Play Button Overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <motion.button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePlay(rec);
                  }}
                  className="p-3 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  <Music className="w-5 h-5" fill="currentColor" />
                </motion.button>
              </div>

              {/* Type Badge */}
              <div className="absolute top-2 right-2">
                <div className={`px-2 py-1 rounded-full bg-gradient-to-r ${getTypeColor(rec.type)} text-white text-xs font-semibold flex items-center gap-1`}>
                  {getTypeIcon(rec.type)}
                  <span className="capitalize">{rec.type}</span>
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="text-white font-semibold text-sm truncate">{rec.title}</h3>
              {rec.artist && (
                <p className="text-gray-400 text-xs truncate">{rec.artist}</p>
              )}
              {showReason && rec.reason && (
                <p className="text-gray-500 text-xs truncate flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  {rec.reason}
                </p>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default RecommendationsSection;

