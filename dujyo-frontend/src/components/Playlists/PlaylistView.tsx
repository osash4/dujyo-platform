import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Play, MoreVertical, Trash2, Edit, Plus, Music } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Playlist, PlaylistTrack, getPlaylist, getPlaylistTracks, removeTrackFromPlaylist } from '../../services/playlistService';
import { usePlayerContext, PlaylistTrack as PlayerPlaylistTrack } from '../../contexts/PlayerContext';

interface PlaylistViewProps {
  playlistId: string;
  onBack?: () => void;
}

const PlaylistView: React.FC<PlaylistViewProps> = ({ playlistId, onBack }) => {
  const navigate = useNavigate();
  const { playTrack, loadPlaylist } = usePlayerContext();
  const [playlist, setPlaylist] = useState<Playlist | null>(null);
  const [tracks, setTracks] = useState<PlaylistTrack[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPlaylist();
  }, [playlistId]);

  const loadPlaylist = async () => {
    try {
      setLoading(true);
      const [playlistData, tracksData] = await Promise.all([
        getPlaylist(playlistId),
        getPlaylistTracks(playlistId),
      ]);
      setPlaylist(playlistData);
      setTracks(tracksData);
    } catch (error) {
      console.error('Error loading playlist:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayTrack = (track: PlaylistTrack) => {
    if (!track.content_id || !track.title) return;
    
    playTrack({
      id: track.content_id,
      title: track.title,
      artist: track.artist_name || 'Unknown Artist',
      url: '', // Will be loaded from content
      cover: track.thumbnail_url || '',
      playerMode: track.content_type === 'audio' ? 'music' : 'video',
      genre: undefined,
    });
  };

  const handlePlayAll = () => {
    if (tracks.length === 0) return;
    
    // Convert PlaylistTrack to PlayerPlaylistTrack
    const playerTracks: PlayerPlaylistTrack[] = tracks.map(track => ({
      id: track.content_id,
      title: track.title || 'Unknown Track',
      url: '', // Will be loaded from content
      playerMode: track.content_type === 'audio' ? 'music' : track.content_type === 'video' ? 'video' : 'gaming',
      artist: track.artist_name,
      cover: track.thumbnail_url || '',
      duration: track.duration,
    }));
    
    loadPlaylist(playerTracks, 0);
  };

  const handleRemoveTrack = async (trackId: string) => {
    if (!playlist) return;
    try {
      await removeTrackFromPlaylist(playlist.playlist_id, trackId);
      await loadPlaylist();
    } catch (error) {
      console.error('Error removing track:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-amber-400"></div>
      </div>
    );
  }

  if (!playlist) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-400 text-lg">Playlist not found</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={onBack || (() => navigate(-1))}
          className="p-2 rounded-full hover:bg-gray-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-gray-400" />
        </button>
        <h1 className="text-2xl font-bold text-white">{playlist.title}</h1>
      </div>

      {/* Playlist Hero */}
      <div className="flex gap-6 p-6 bg-gray-800 rounded-xl border border-gray-700">
        <div className="w-48 h-48 rounded-lg overflow-hidden bg-gradient-to-br from-amber-500/20 to-orange-600/20 flex items-center justify-center flex-shrink-0">
          {playlist.cover_image_url ? (
            <img
              src={playlist.cover_image_url}
              alt={playlist.title}
              className="w-full h-full object-cover"
            />
          ) : (
            <Music className="w-24 h-24 text-amber-400/50" />
          )}
        </div>

        <div className="flex-1 flex flex-col justify-between">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">{playlist.title}</h2>
            {playlist.description && (
              <p className="text-gray-400 mb-4">{playlist.description}</p>
            )}
            <div className="flex items-center gap-4 text-sm text-gray-400">
              <span>{playlist.track_count} tracks</span>
              {playlist.is_public && <span>• Public</span>}
              {playlist.is_collaborative && <span>• Collaborative</span>}
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <motion.button
              onClick={handlePlayAll}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-lg font-semibold hover:from-amber-600 hover:to-orange-700 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="w-5 h-5" fill="currentColor" />
              <span>Play All</span>
            </motion.button>
            <button className="p-3 rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors">
              <MoreVertical className="w-5 h-5 text-gray-400" />
            </button>
          </div>
        </div>
      </div>

      {/* Tracks List */}
      <div className="space-y-2">
        {tracks.length === 0 ? (
          <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
            <Music className="w-16 h-16 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400 text-lg">No tracks in this playlist</p>
            <p className="text-gray-500 text-sm mt-2">Add tracks to get started</p>
          </div>
        ) : (
          tracks.map((track, index) => (
            <motion.div
              key={track.playlist_track_id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-4 p-4 bg-gray-800 rounded-lg hover:bg-gray-750 border border-gray-700 hover:border-amber-400/50 transition-all group"
            >
              <div className="w-10 text-center text-gray-400 group-hover:text-amber-400">
                {index + 1}
              </div>
              
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-700 flex-shrink-0">
                {track.thumbnail_url ? (
                  <img
                    src={track.thumbnail_url}
                    alt={track.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Music className="w-6 h-6 text-gray-500" />
                  </div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-white font-semibold truncate">{track.title || 'Unknown Track'}</h3>
                <p className="text-gray-400 text-sm truncate">{track.artist_name || 'Unknown Artist'}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePlayTrack(track)}
                  className="p-2 rounded-full hover:bg-gray-700 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Play className="w-4 h-4 text-amber-400" fill="currentColor" />
                </button>
                <button
                  onClick={() => handleRemoveTrack(track.playlist_track_id)}
                  className="p-2 rounded-full hover:bg-red-500/20 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default PlaylistView;

