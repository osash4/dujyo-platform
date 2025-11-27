import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Music, Globe, Lock, Users } from 'lucide-react';
import { createPlaylist, CreatePlaylistRequest } from '../../services/playlistService';

interface CreatePlaylistModalProps {
  onClose: () => void;
  onCreated: () => void;
}

const CreatePlaylistModal: React.FC<CreatePlaylistModalProps> = ({
  onClose,
  onCreated,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isPublic, setIsPublic] = useState(false);
  const [isCollaborative, setIsCollaborative] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim()) {
      setError('Title is required');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const request: CreatePlaylistRequest = {
        title: title.trim(),
        description: description.trim() || undefined,
        cover_image_url: coverImageUrl.trim() || undefined,
        is_public: isPublic,
        is_collaborative: isCollaborative,
      };

      await createPlaylist(request);
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create playlist');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center gap-2">
              <Music className="w-6 h-6 text-amber-400" />
              Create Playlist
            </h2>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-gray-700 transition-colors"
            >
              <X className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Title *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My Awesome Playlist"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
                required
              />
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What's this playlist about?"
                rows={3}
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            {/* Cover Image URL */}
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">
                Cover Image URL
              </label>
              <input
                type="url"
                value={coverImageUrl}
                onChange={(e) => setCoverImageUrl(e.target.value)}
                placeholder="https://example.com/cover.jpg"
                className="w-full px-4 py-2 bg-gray-900 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-amber-400"
              />
            </div>

            {/* Privacy Settings */}
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-300">
                Privacy
              </label>
              
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => setIsPublic(true)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                    isPublic
                      ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <Globe className="w-5 h-5" />
                  <span>Public</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => setIsPublic(false)}
                  className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-lg border transition-all ${
                    !isPublic
                      ? 'bg-amber-500/20 border-amber-400 text-amber-400'
                      : 'bg-gray-900 border-gray-700 text-gray-400 hover:border-gray-600'
                  }`}
                >
                  <Lock className="w-5 h-5" />
                  <span>Private</span>
                </button>
              </div>
            </div>

            {/* Collaborative */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsCollaborative(!isCollaborative)}
                className={`w-12 h-6 rounded-full transition-colors ${
                  isCollaborative ? 'bg-amber-500' : 'bg-gray-700'
                }`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full transition-transform ${
                    isCollaborative ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-gray-400" />
                <span className="text-gray-300">Allow collaboration</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
                {error}
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading || !title.trim()}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white rounded-lg font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Creating...' : 'Create Playlist'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

export default CreatePlaylistModal;

