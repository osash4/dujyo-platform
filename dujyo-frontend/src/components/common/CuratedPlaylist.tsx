import React from 'react';
import { motion } from 'framer-motion';
import { Music, Play, Sparkles } from 'lucide-react';
import Logo from './Logo';

interface PlaylistItem {
  id: string;
  title: string;
  artist?: string;
  duration?: string;
  cover?: string;
}

interface CuratedPlaylistProps {
  title: string;
  description?: string;
  items: PlaylistItem[];
  onPlay?: (item: PlaylistItem) => void;
  className?: string;
}

const CuratedPlaylist: React.FC<CuratedPlaylistProps> = ({
  title,
  description = "Curated by DUJYO",
  items,
  onPlay,
  className = ''
}) => {
  return (
    <motion.div
      className={`bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-amber-500/30 shadow-xl ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={20} className="text-amber-400" />
            <h3 className="text-2xl font-bold text-white">{title}</h3>
          </div>
          <p className="text-sm text-gray-400 flex items-center gap-2">
            <Logo size="sm" showText={false} variant="icon" />
            <span>{description}</span>
          </p>
        </div>
        <div className="px-3 py-1 bg-amber-500/20 text-amber-400 rounded-full text-xs font-bold border border-amber-500/50">
          {items.length} tracks
        </div>
      </div>

      {/* Playlist Items */}
      <div className="space-y-2">
        {items.map((item, index) => (
          <motion.div
            key={item.id}
            className="flex items-center gap-4 p-3 rounded-lg bg-gray-900/50 hover:bg-gray-800/50 transition-all duration-200 group cursor-pointer"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            whileHover={{ scale: 1.02 }}
            onClick={() => onPlay?.(item)}
          >
            <div className="relative">
              {item.cover ? (
                <img
                  src={item.cover}
                  alt={item.title}
                  className="w-12 h-12 rounded-lg object-cover"
                />
              ) : (
                <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-amber-500/20 to-orange-500/20 flex items-center justify-center">
                  <Music size={20} className="text-amber-400" />
                </div>
              )}
              <motion.div
                className="absolute inset-0 bg-black/50 rounded-lg flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                whileHover={{ scale: 1.1 }}
              >
                <Play size={20} className="text-white" fill="white" />
              </motion.div>
            </div>

            <div className="flex-1 min-w-0">
              <h4 className="font-semibold text-white truncate group-hover:text-amber-400 transition-colors">
                {item.title}
              </h4>
              {item.artist && (
                <p className="text-sm text-gray-400 truncate">{item.artist}</p>
              )}
            </div>

            {item.duration && (
              <span className="text-xs text-gray-500">{item.duration}</span>
            )}
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default CuratedPlaylist;

