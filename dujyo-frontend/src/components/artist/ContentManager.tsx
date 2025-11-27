import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  Music, 
  Play, 
  Pause, 
  Edit, 
  Trash2, 
  Eye, 
  EyeOff,
  MoreVertical,
  Search,
  SortAsc,
  SortDesc,
  Plus,
  FolderPlus
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { getApiBaseUrl } from '../../utils/apiConfig';

interface Song {
  id: string;
  title: string;
  artist: string;
  album: string;
  genre: string;
  duration: number;
  uploadDate: Date;
  isPublic: boolean;
  streams: number;
  earnings: number;
  likes: number;
  shares: number;
  tags: string[];
  coverImage?: string;
  audioUrl: string;
  royaltyRate: number;
  collaborators: Array<{
    name: string;
    address: string;
    percentage: number;
  }>;
  lastPlayed?: Date;
  playCount: number;
}

interface Album {
  id: string;
  title: string;
  artist: string;
  releaseDate: Date;
  coverImage?: string;
  songs: Song[];
  totalStreams: number;
  totalEarnings: number;
  isPublic: boolean;
}

const ContentManager: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [songs, setSongs] = useState<Song[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'songs' | 'albums'>('songs');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'title' | 'date' | 'streams' | 'earnings'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterGenre, setFilterGenre] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'public' | 'private'>('all');
  const [selectedSongs, setSelectedSongs] = useState<string[]>([]);
  const [currentlyPlaying, setCurrentlyPlaying] = useState<string | null>(null);
  const [, setEditingSong] = useState<Song | null>(null);

  useEffect(() => {
    fetchContent();
  }, []);

  const fetchContent = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('No authentication token found');
      }

      // Get wallet address from multiple sources
      let walletAddress = user?.uid;
      
      if (!walletAddress || !walletAddress.startsWith('DU')) {
        walletAddress = localStorage.getItem('dujyo_wallet_account');
      }
      
      if (!walletAddress || !walletAddress.startsWith('DU')) {
        const storedWallet = localStorage.getItem('dujyo_wallet');
        if (storedWallet) {
          try {
            const wallet = JSON.parse(storedWallet);
            if (wallet.address && wallet.address.startsWith('DU')) {
              walletAddress = wallet.address;
            }
          } catch (e) {
            console.warn('Error parsing dujyo_wallet:', e);
          }
        }
      }

      if (!walletAddress || !walletAddress.startsWith('DU')) {
        console.warn('❌ [CONTENT] No valid native blockchain address available (must start with "DU")');
        setLoading(false);
        return;
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/content/artist/${walletAddress}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch content: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      
      if (data.success && data.content) {
        // Map backend ContentItem to frontend Song format
        const mappedSongs: Song[] = data.content
          .filter((item: any) => item.content_type === 'audio') // Only audio for now
          .map((item: any) => ({
            id: item.content_id,
            title: item.title,
            artist: item.artist_name,
            album: item.genre || 'Single', // Use genre as album placeholder
            genre: item.genre || 'Unknown',
            duration: 0, // Not available from backend yet
            uploadDate: new Date(item.created_at),
            isPublic: true, // Default to public
            streams: 0, // Not available from backend yet
            earnings: item.price || 0,
            likes: 0,
            shares: 0,
            tags: item.genre ? [item.genre] : [],
            coverImage: item.thumbnail_url || undefined,
            audioUrl: item.file_url || '',
            royaltyRate: 0,
            collaborators: [],
            playCount: 0,
          }));
        
        setSongs(mappedSongs);
        setAlbums([]); // Albums not implemented yet
      } else {
        setSongs([]);
        setAlbums([]);
      }
    } catch (error) {
      console.error('Error fetching content:', error);
      setSongs([]);
      setAlbums([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const toggleSongVisibility = (songId: string) => {
    setSongs(prev => prev.map(song => 
      song.id === songId ? { ...song, isPublic: !song.isPublic } : song
    ));
  };

  const deleteSong = (songId: string) => {
    if (window.confirm('Are you sure you want to delete this song?')) {
      setSongs(prev => prev.filter(song => song.id !== songId));
    }
  };

  const togglePlayPause = (songId: string) => {
    if (currentlyPlaying === songId) {
      setCurrentlyPlaying(null);
    } else {
      setCurrentlyPlaying(songId);
    }
  };

  const toggleSongSelection = (songId: string) => {
    setSelectedSongs(prev => 
      prev.includes(songId) 
        ? prev.filter(id => id !== songId)
        : [...prev, songId]
    );
  };

  const selectAllSongs = () => {
    setSelectedSongs(filteredSongs.map(song => song.id));
  };

  const clearSelection = () => {
    setSelectedSongs([]);
  };

  const filteredSongs = songs.filter(song => {
    const matchesSearch = searchTerm === '' || 
      song.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.album.toLowerCase().includes(searchTerm.toLowerCase()) ||
      song.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesGenre = filterGenre === '' || song.genre === filterGenre;
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'public' && song.isPublic) ||
      (filterStatus === 'private' && !song.isPublic);
    
    return matchesSearch && matchesGenre && matchesStatus;
  });

  const sortedSongs = [...filteredSongs].sort((a, b) => {
    let aValue: any, bValue: any;
    
    switch (sortBy) {
      case 'title':
        aValue = a.title.toLowerCase();
        bValue = b.title.toLowerCase();
        break;
      case 'date':
        aValue = a.uploadDate.getTime();
        bValue = b.uploadDate.getTime();
        break;
      case 'streams':
        aValue = a.streams;
        bValue = b.streams;
        break;
      case 'earnings':
        aValue = a.earnings;
        bValue = b.earnings;
        break;
      default:
        return 0;
    }
    
    if (sortOrder === 'asc') {
      return aValue > bValue ? 1 : -1;
    } else {
      return aValue < bValue ? 1 : -1;
    }
  });

  const genres = [...new Set(songs.map(song => song.genre))];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6" data-tour="content-hub">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Content Manager</h1>
          <p className="text-gray-400 mt-1">Manage your music catalog and releases</p>
        </div>
        <div className="flex items-center space-x-4">
          <button 
            onClick={() => navigate('/upload')}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Upload Content</span>
          </button>
          <button 
            onClick={() => {
              // TODO: Implement create album functionality
              alert('Create Album functionality coming soon!');
            }}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <FolderPlus className="w-4 h-4" />
            <span>Create Album</span>
          </button>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex items-center space-x-4">
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setViewMode('songs')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'songs' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Songs ({songs.length})
          </button>
          <button
            onClick={() => setViewMode('albums')}
            className={`px-4 py-2 rounded-md transition-colors ${
              viewMode === 'albums' 
                ? 'bg-purple-600 text-white' 
                : 'text-gray-400 hover:text-white'
            }`}
          >
            Albums ({albums.length})
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-64">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search songs, albums, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-gray-800 text-white pl-10 pr-4 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
          />
        </div>
        
        <select
          value={filterGenre}
          onChange={(e) => setFilterGenre(e.target.value)}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
        >
          <option value="">All Genres</option>
          {genres.map(genre => (
            <option key={genre} value={genre}>{genre}</option>
          ))}
        </select>
        
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as any)}
          className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
        >
          <option value="all">All Status</option>
          <option value="public">Public</option>
          <option value="private">Private</option>
        </select>
        
        <div className="flex items-center space-x-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-gray-800 text-white px-3 py-2 rounded-lg border border-gray-700 focus:border-purple-500 focus:outline-none"
          >
            <option value="date">Sort by Date</option>
            <option value="title">Sort by Title</option>
            <option value="streams">Sort by Streams</option>
            <option value="earnings">Sort by Earnings</option>
          </select>
          
          <button
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className="bg-gray-800 hover:bg-gray-700 text-white p-2 rounded-lg border border-gray-700 transition-colors"
          >
            {sortOrder === 'asc' ? <SortAsc className="w-4 h-4" /> : <SortDesc className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedSongs.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-purple-900/20 border border-purple-500/30 p-4 rounded-lg"
        >
          <div className="flex items-center justify-between">
            <span className="text-white font-medium">
              {selectedSongs.length} song{selectedSongs.length > 1 ? 's' : ''} selected
            </span>
            <div className="flex items-center space-x-2">
              <button className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors">
                Make Public
              </button>
              <button className="bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm transition-colors">
                Make Private
              </button>
              <button className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm transition-colors">
                Delete
              </button>
              <button
                onClick={clearSelection}
                className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Songs List */}
      {viewMode === 'songs' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gray-800 rounded-xl shadow-lg overflow-hidden"
        >
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-bold text-white">Your Songs</h3>
              <div className="flex items-center space-x-2">
                <button
                  onClick={selectAllSongs}
                  className="text-purple-400 hover:text-purple-300 text-sm transition-colors"
                >
                  Select All
                </button>
                <span className="text-gray-400">|</span>
                <button
                  onClick={clearSelection}
                  className="text-gray-400 hover:text-gray-300 text-sm transition-colors"
                >
                  Clear Selection
                </button>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                    <input type="checkbox" className="rounded" />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Song</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Album</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Duration</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Streams</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Earnings</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-700">
                {sortedSongs.map((song) => (
                  <tr key={song.id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedSongs.includes(song.id)}
                        onChange={() => toggleSongSelection(song.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-3">
                        <button
                          onClick={() => togglePlayPause(song.id)}
                          className="w-10 h-10 bg-purple-600 hover:bg-purple-700 rounded-full flex items-center justify-center transition-colors"
                        >
                          {currentlyPlaying === song.id ? (
                            <Pause className="w-4 h-4 text-white" />
                          ) : (
                            <Play className="w-4 h-4 text-white" />
                          )}
                        </button>
                        <div>
                          <p className="text-white font-medium">{song.title}</p>
                          <p className="text-gray-400 text-sm">{song.artist}</p>
                          <div className="flex items-center space-x-1 mt-1">
                            {song.tags.map((tag, index) => (
                              <span key={index} className="bg-gray-600 text-gray-300 px-2 py-1 rounded text-xs">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {song.album}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDuration(song.duration)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatNumber(song.streams)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-green-400">
                      {formatCurrency(song.earnings)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <button
                        onClick={() => toggleSongVisibility(song.id)}
                        className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                          song.isPublic
                            ? 'bg-green-900 text-green-300'
                            : 'bg-gray-900 text-gray-300'
                        }`}
                      >
                        {song.isPublic ? (
                          <>
                            <Eye className="w-3 h-3" />
                            <span>Public</span>
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            <span>Private</span>
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {formatDate(song.uploadDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setEditingSong(song)}
                          className="text-blue-400 hover:text-blue-300 transition-colors"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteSong(song.id)}
                          className="text-red-400 hover:text-red-300 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-300 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      )}

      {/* Albums List */}
      {viewMode === 'albums' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          {albums.map((album) => (
            <div key={album.id} className="bg-gray-800 rounded-xl shadow-lg overflow-hidden">
              <div className="aspect-square bg-gradient-to-br from-purple-600 to-orange-600 flex items-center justify-center">
                <Music className="w-16 h-16 text-white" />
              </div>
              <div className="p-6">
                <h3 className="text-xl font-bold text-white mb-2">{album.title}</h3>
                <p className="text-gray-400 mb-4">{album.artist}</p>
                
                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Songs:</span>
                    <span className="text-white">{album.songs.length}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Streams:</span>
                    <span className="text-white">{formatNumber(album.totalStreams)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Earnings:</span>
                    <span className="text-green-400 font-semibold">{formatCurrency(album.totalEarnings)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Released:</span>
                    <span className="text-white">{formatDate(album.releaseDate)}</span>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <button
                    className={`flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                      album.isPublic
                        ? 'bg-green-900 text-green-300'
                        : 'bg-gray-900 text-gray-300'
                    }`}
                  >
                    {album.isPublic ? (
                      <>
                        <Eye className="w-3 h-3" />
                        <span>Public</span>
                      </>
                    ) : (
                      <>
                        <EyeOff className="w-3 h-3" />
                        <span>Private</span>
                      </>
                    )}
                  </button>
                  
                  <div className="flex items-center space-x-2">
                    <button className="text-blue-400 hover:text-blue-300 transition-colors">
                      <Edit className="w-4 h-4" />
                    </button>
                    <button className="text-gray-400 hover:text-gray-300 transition-colors">
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </motion.div>
      )}
    </div>
  );
};

export default ContentManager;
