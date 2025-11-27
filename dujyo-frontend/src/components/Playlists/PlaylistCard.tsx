import React from 'react';
import { motion } from 'framer-motion';
import { Music, Clock, Users, Lock, Globe, MoreVertical, Play } from 'lucide-react';
import { Playlist } from '../../services/playlistService';
import Logo from '../common/Logo';

interface PlaylistCardProps {
  playlist: Playlist;
  onClick?: () => void;
  onPlay?: () => void;
  onMenuClick?: (e: React.MouseEvent) => void;
}

const PlaylistCard: React.FC<PlaylistCardProps> = ({
  playlist,
  onClick,
  onPlay,
  onMenuClick,
}) => {
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.02 }}
      className="bg-gray-800 rounded-xl p-4 cursor-pointer group relative overflow-hidden border border-gray-700 hover:border-amber-400/50 transition-all duration-300"
      onClick={onClick}
    >
      {/* Cover Image or Placeholder */}
      <div className="relative mb-4 aspect-square rounded-lg overflow-hidden bg-gradient-to-br from-amber-500/20 to-orange-600/20">
        {playlist.cover_image_url ? (
          <img
            src={playlist.cover_image_url}
            alt={playlist.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Music className="w-16 h-16 text-amber-400/50" />
          </div>
        )}
        
        {/* Play Button Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <motion.button
            onClick={(e) => {
              e.stopPropagation();
              onPlay?.();
            }}
            className="p-4 rounded-full bg-amber-500 hover:bg-amber-600 text-white shadow-lg"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <Play className="w-6 h-6" fill="currentColor" />
          </motion.button>
        </div>
      </div>

      {/* Playlist Info */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <h3 className="text-white font-semibold text-lg truncate flex-1">
            {playlist.title}
          </h3>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onMenuClick?.(e);
            }}
            className="p-1 rounded-full hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
          >
            <MoreVertical className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {playlist.description && (
          <p className="text-gray-400 text-sm line-clamp-2">{playlist.description}</p>
        )}

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <Music className="w-3 h-3" />
            <span>{playlist.track_count} tracks</span>
          </div>
          {playlist.total_duration_seconds > 0 && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatDuration(playlist.total_duration_seconds)}</span>
            </div>
          )}
          {playlist.is_collaborative && (
            <div className="flex items-center gap-1">
              <Users className="w-3 h-3" />
              <span>Collaborative</span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          {playlist.is_public ? (
            <div className="flex items-center gap-1 text-amber-400 text-xs">
              <Globe className="w-3 h-3" />
              <span>Public</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 text-gray-500 text-xs">
              <Lock className="w-3 h-3" />
              <span>Private</span>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default PlaylistCard;

