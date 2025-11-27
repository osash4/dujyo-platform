import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, Search, Filter } from 'lucide-react';
import { Playlist, getPlaylists } from '../../services/playlistService';
import PlaylistCard from './PlaylistCard';
import CreatePlaylistModal from './CreatePlaylistModal';

interface PlaylistListProps {
  onPlaylistClick?: (playlist: Playlist) => void;
  onPlaylistPlay?: (playlist: Playlist) => void;
}

const PlaylistList: React.FC<PlaylistListProps> = ({
  onPlaylistClick,
  onPlaylistPlay,
}) => {
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [filteredPlaylists, setFilteredPlaylists] = useState<Playlist[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filter, setFilter] = useState<'all' | 'public' | 'private' | 'collaborative'>('all');

  useEffect(() => {
    loadPlaylists();
  }, []);

  useEffect(() => {
    filterPlaylists();
  }, [playlists, searchQuery, filter]);

  const loadPlaylists = async () => {
    try {
      setLoading(true);
      const data = await getPlaylists(true);
      setPlaylists(data);
    } catch (error) {
      console.error('Error loading playlists:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterPlaylists = () => {
    let filtered = [...playlists];

    // Apply filter
    if (filter === 'public') {
      filtered = filtered.filter((p) => p.is_public);
    } else if (filter === 'private') {
      filtered = filtered.filter((p) => !p.is_public);
    } else if (filter === 'collaborative') {
      filtered = filtered.filter((p) => p.is_collaborative);
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.title.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query)
      );
    }

    setFilteredPlaylists(filtered);
  };

  const handlePlaylistCreated = () => {
    setShowCreateModal(false);
    loadPlaylists();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Your Playlists</h2>
          <p className="text-gray-400 text-sm mt-1">
            {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
          </p>
        </div>
        <motion.button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-700 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Plus className="w-5 h-5" />
          <span>Create Playlist</span>
        </motion.button>
      </div>

      {/* Search and Filter */}
      <div className="flex items-center gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search playlists..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-amber-400"
          >
            <option value="all">All</option>
            <option value="public">Public</option>
            <option value="private">Private</option>
            <option value="collaborative">Collaborative</option>
          </select>
        </div>
      </div>

      {/* Playlists Grid */}
      {filteredPlaylists.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-400 text-lg">
            {searchQuery || filter !== 'all'
              ? 'No playlists match your search'
              : 'No playlists yet. Create your first one!'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {filteredPlaylists.map((playlist) => (
            <PlaylistCard
              key={playlist.playlist_id}
              playlist={playlist}
              onClick={() => onPlaylistClick?.(playlist)}
              onPlay={() => onPlaylistPlay?.(playlist)}
            />
          ))}
        </div>
      )}

      {/* Create Playlist Modal */}
      {showCreateModal && (
        <CreatePlaylistModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handlePlaylistCreated}
        />
      )}
    </div>
  );
};

export default PlaylistList;

