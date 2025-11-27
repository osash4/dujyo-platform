import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import MusicCard from './MusicCard';
import { usePlayerContext } from '../../contexts/PlayerContext';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { Music, Loader2, AlertCircle } from 'lucide-react';
import Logo from '../common/Logo';

interface MusicItem {
  id: string;
  title: string;
  artist: string;
  src: string;
  imageUrl?: string;
  thumbnail_url?: string;
  file_url?: string;
  artist_name?: string;
  content_id?: string;
  genre?: string;
}

const ExploreMusic: React.FC = () => {
  const [musicList, setMusicList] = useState<MusicItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { playTrack } = usePlayerContext();

  useEffect(() => {
    fetchMusicContent();
  }, []);

  const fetchMusicContent = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('jwt_token');
      
      // Try to fetch public content first
      const response = await fetch(`${apiBaseUrl}/api/v1/content/public?type=audio&limit=20`, {
        headers: {
          ...(token && { 'Authorization': `Bearer ${token}` }),
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.content && Array.isArray(data.content)) {
          const mappedMusic: MusicItem[] = data.content.map((item: any) => ({
            id: item.content_id || item.id,
            title: item.title || 'Unknown Title',
            artist: item.artist_name || item.artist || 'Unknown Artist',
            src: item.file_url || item.src || '',
            imageUrl: item.thumbnail_url || item.cover || item.imageUrl,
            genre: item.genre || 'Unknown'
          }));
          
          setMusicList(mappedMusic);
        } else {
          // Fallback to sample music if no content available
          setMusicList(getSampleMusic());
        }
      } else {
        // Fallback to sample music
        setMusicList(getSampleMusic());
      }
    } catch (err) {
      console.error('Error fetching music content:', err);
      setError('Failed to load music content');
      // Fallback to sample music
      setMusicList(getSampleMusic());
    } finally {
    setIsLoading(false);
    }
  };

  const getSampleMusic = (): MusicItem[] => [
    { 
      id: '1', 
      title: 'Dices', 
      artist: 'Rian', 
      src: '/music/Dices.wav', 
      imageUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=400&h=400&fit=crop',
      genre: 'Reggaeton'
    },
    { 
      id: '2', 
      title: 'COMOPAMORA', 
      artist: 'Rian', 
      src: '/music/COMOPAMORA.wav', 
      imageUrl: 'https://images.unsplash.com/photo-1511379938547-c1f69419868d?w=400&h=400&fit=crop',
      genre: 'Reggaeton'
    },
    { 
      id: '3', 
      title: 'Soy un principiante', 
      artist: 'YVML', 
      src: '/music/Soy un principiante.wav', 
      imageUrl: 'https://images.unsplash.com/photo-1571330735066-03aaa9429d89?w=400&h=400&fit=crop',
      genre: 'Reggaeton'
    }
  ];

  const handlePlaySong = (song: MusicItem) => {
    playTrack({
      id: song.id,
      title: song.title,
      artist: song.artist,
      url: song.src,
      cover: song.imageUrl || '',
      playerMode: 'music',
      genre: song.genre
    });
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--bg-primary)' }}>
      {/* Header Section */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" />
        <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-orange-600/10" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="flex items-center justify-center gap-4 mb-4">
              <Logo size="lg" variant="icon" showText={false} />
              <h1 className="text-3xl md:text-5xl font-bold bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 bg-clip-text text-transparent">
                Explore Music
              </h1>
            </div>
            <p className="text-gray-300 text-lg md:text-xl max-w-2xl mx-auto">
              Discover the latest tracks from artists around the world
            </p>
          </motion.div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
            <p className="text-gray-400">Loading music...</p>
          </div>
        ) : error && musicList.length === 0 ? (
          <motion.div
            className="flex flex-col items-center justify-center py-20"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <AlertCircle className="w-12 h-12 text-red-400 mb-4" />
            <p className="text-gray-400 mb-4">{error}</p>
            <button
              onClick={fetchMusicContent}
              className="btn-primary px-6 py-2"
            >
              Retry
            </button>
          </motion.div>
        ) : musicList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Music className="w-12 h-12 text-gray-500 mb-4" />
            <p className="text-gray-400">No music available at the moment</p>
        </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            {musicList.map((song, index) => (
              <motion.div
                key={song.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: index * 0.1 }}
                whileHover={{ scale: 1.02 }}
              >
                <MusicCard
                  title={song.title}
                  artist={song.artist}
                  coverImage={song.imageUrl}
                  onClick={() => handlePlaySong(song)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ExploreMusic;
