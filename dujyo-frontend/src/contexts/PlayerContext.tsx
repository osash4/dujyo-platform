import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';
import { useBlockchain } from './BlockchainContext';
import { useEventEmitter } from './EventBusContext';
import { useAuth } from '../auth/AuthContext';
import { getApiBaseUrl } from '../utils/apiConfig';

export interface Track {
  id: string;
  title: string;
  url: string;
  playerMode: 'music' | 'video' | 'gaming';
  artist?: string;
  cover?: string;
  duration?: number;
  genre?: string;  // ⭐ Para Genre Explorer bonus
  artistFollowers?: number;  // ⭐ Para Early Adopter bonus
}

export interface StreamEarnData {
  artistTokens: number;
  listenerTokens: number;
  totalStreamTime: number;
  lastEarnTime: number;
  dailyLimit: number;
  dailyEarned: number;
}

export interface PlaylistTrack {
  id: string;
  title: string;
  url: string;
  playerMode: 'music' | 'video' | 'gaming';
  artist?: string;
  cover?: string;
  duration?: number;
  genre?: string;
  artistFollowers?: number;
}

export interface PlayerContextType {
  currentTrack: Track | null;
  isPlaying: boolean;
  playerPosition: 'top' | 'bottom';
  playTrack: (track: Track) => void;
  pauseTrack: () => void;
  resumeTrack: () => void;
  stopTrack: () => void;
  setPlayerPosition: (position: 'top' | 'bottom') => void;
  setPlaying: (playing: boolean) => void;
  // Playlist functionality
  currentPlaylist: PlaylistTrack[];
  currentPlaylistIndex: number;
  loadPlaylist: (tracks: PlaylistTrack[], startIndex?: number) => void;
  nextTrack: () => void;
  previousTrack: () => void;
  isShuffled: boolean;
  toggleShuffle: () => void;
  repeatMode: 'off' | 'all' | 'one';
  setRepeatMode: (mode: 'off' | 'all' | 'one') => void;
  // Stream-to-Earn functionality
  streamEarnData: StreamEarnData;
  startStreamEarn: () => void;
  stopStreamEarn: () => void;
  // Funciones adicionales para compatibilidad con ExploreMusic
  playerState: {
    isPlaying: boolean;
    title?: string;
    artist?: string;
    cover?: string;
  };
  playContent: (title: string, artist: string, src: string, type: string) => void;
  stopContent: () => void;
}

export const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const usePlayerContext = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayerContext must be used within a PlayerProvider');
  }
  return context;
};

interface PlayerProviderProps {
  children: ReactNode;
}

export const PlayerProvider: React.FC<PlayerProviderProps> = ({ children }) => {
  // Get blockchain context for real-time updates
  const blockchainContext = useBlockchain();
  const emitEvent = useEventEmitter();
  const { getUserRole } = useAuth();
  
  // Initialize state from localStorage to persist across page changes
  const [currentTrack, setCurrentTrack] = useState<Track | null>(() => {
    const stored = localStorage.getItem('dujyo_current_track');
    return stored ? JSON.parse(stored) : null;
  });
  const [isPlaying, setIsPlaying] = useState(() => {
    const stored = localStorage.getItem('dujyo_is_playing');
    return stored ? JSON.parse(stored) : false;
  });
  const [playerPosition, setPlayerPosition] = useState<'top' | 'bottom'>(() => {
    const stored = localStorage.getItem('dujyo_player_position');
    return (stored as 'top' | 'bottom') || 'bottom';
  });

  // Playlist state
  const [currentPlaylist, setCurrentPlaylist] = useState<PlaylistTrack[]>(() => {
    const stored = localStorage.getItem('dujyo_current_playlist');
    return stored ? JSON.parse(stored) : [];
  });
  const [currentPlaylistIndex, setCurrentPlaylistIndex] = useState(() => {
    const stored = localStorage.getItem('dujyo_current_playlist_index');
    return stored ? parseInt(stored) : -1;
  });
  const [isShuffled, setIsShuffled] = useState(() => {
    const stored = localStorage.getItem('dujyo_is_shuffled');
    return stored ? JSON.parse(stored) : false;
  });
  const [repeatMode, setRepeatMode] = useState<'off' | 'all' | 'one'>(() => {
    const stored = localStorage.getItem('dujyo_repeat_mode');
    return (stored as 'off' | 'all' | 'one') || 'off';
  });

  // Stream-to-Earn state
  const [streamEarnData, setStreamEarnData] = useState<StreamEarnData>(() => {
    const stored = localStorage.getItem('dujyo_stream_earn_data');
    return stored ? JSON.parse(stored) : {
      artistTokens: 0,
      listenerTokens: 0,
      totalStreamTime: 0,
      lastEarnTime: 0,
      dailyLimit: 120, // 120 minutes daily limit
      dailyEarned: 0
    };
  });

  // Stream-to-Earn timer refs
  const artistTimerRef = useRef<NodeJS.Timeout | null>(null);
  const listenerTimerRef = useRef<NodeJS.Timeout | null>(null);
  const balanceRefreshRef = useRef<NodeJS.Timeout | null>(null);

  // Persist state to localStorage whenever it changes
  useEffect(() => {
    if (currentTrack) {
      localStorage.setItem('dujyo_current_track', JSON.stringify(currentTrack));
    } else {
      localStorage.removeItem('dujyo_current_track');
    }
  }, [currentTrack]);

  useEffect(() => {
    localStorage.setItem('dujyo_is_playing', JSON.stringify(isPlaying));
  }, [isPlaying]);

  useEffect(() => {
    localStorage.setItem('dujyo_player_position', playerPosition);
  }, [playerPosition]);

  useEffect(() => {
    localStorage.setItem('dujyo_stream_earn_data', JSON.stringify(streamEarnData));
  }, [streamEarnData]);

  // Persist playlist state
  useEffect(() => {
    localStorage.setItem('dujyo_current_playlist', JSON.stringify(currentPlaylist));
  }, [currentPlaylist]);

  useEffect(() => {
    localStorage.setItem('dujyo_current_playlist_index', currentPlaylistIndex.toString());
  }, [currentPlaylistIndex]);

  useEffect(() => {
    localStorage.setItem('dujyo_is_shuffled', JSON.stringify(isShuffled));
  }, [isShuffled]);

  useEffect(() => {
    localStorage.setItem('dujyo_repeat_mode', repeatMode);
  }, [repeatMode]);

  // Stream-to-Earn functions
  const startStreamEarn = useCallback(() => {
    if (!currentTrack) {
      console.log('❌ No current track for stream-earn');
      return;
    }

    const userRole = getUserRole();
    console.log(`🎵 Starting stream-earn for ${userRole}`);
    
    // Force balance refresh every 5 seconds
    balanceRefreshRef.current = setInterval(() => {
      if (blockchainContext?.refreshBalance) {
        blockchainContext.refreshBalance().catch(() => {});
      }
      window.dispatchEvent(new CustomEvent('dujyo:balance-updated'));
    }, 5000);
    
    // Check daily limit
    const today = new Date().toDateString();
    const lastEarnDate = new Date(streamEarnData.lastEarnTime).toDateString();
    
    if (today !== lastEarnDate) {
      // Reset daily counter for new day
      setStreamEarnData(prev => ({
        ...prev,
        dailyEarned: 0,
        lastEarnTime: Date.now()
      }));
    }

    // Solo ejecutar el timer del rol del usuario (artist O listener, no ambos)
    const streamEarnTimerRef = userRole === 'artist' ? artistTimerRef : listenerTimerRef;
    
    streamEarnTimerRef.current = setInterval(async () => {
      try {
        // Call REAL stream-earn endpoint
        const token = localStorage.getItem('jwt_token');
        if (!token) {
          console.error('No authentication token for stream-earn');
          return;
        }

        const requestBody = {
          type_: userRole, // 'artist' o 'listener'
          duration_seconds: 10, // 10 segundos por tick
          track_id: currentTrack.id,
          track_title: currentTrack.title,
          track_genre: currentTrack.genre || 'pop', // Default genre
          artist_followers: currentTrack.artistFollowers || 1000, // Default followers
        };
        
        console.log('📤 Stream-earn request:', requestBody);
        
        const apiBaseUrl = getApiBaseUrl();
        const response = await fetch(`${apiBaseUrl}/api/stream-earn`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        console.log('📥 Stream-earn response:', response.status, response.statusText);

        if (!response.ok) {
          // Intentar leer el body del error
          const errorText = await response.text();
          console.error(`❌ Stream-earn error ${response.status}:`, errorText);
          
          if (response.status === 401) {
            console.error('❌ Token expirado. Por favor recarga la página y vuelve a iniciar sesión.');
            // Limpiar timer para evitar spam
            if (streamEarnTimerRef.current) {
              clearInterval(streamEarnTimerRef.current);
              streamEarnTimerRef.current = null;
            }
          }
          return;
        }

        const result = await response.json();
        
        // Usar earned_amount del backend (incluye bonus)
        const earnedAmount = result.earned_amount || 0;
        
        // Actualizar el estado según el rol
        if (userRole === 'artist') {
          setStreamEarnData(prev => ({
            ...prev,
            artistTokens: prev.artistTokens + earnedAmount,
            totalStreamTime: prev.totalStreamTime + 10,
            dailyEarned: prev.dailyEarned + (10/60) // 10 seconds = 0.167 minutes
          }));
        } else {
          setStreamEarnData(prev => ({
            ...prev,
            listenerTokens: prev.listenerTokens + earnedAmount,
            totalStreamTime: prev.totalStreamTime + 10,
            dailyEarned: prev.dailyEarned + (10/60)
          }));
        }

        // Show notification con bonus info
        const bonusText = result.bonus_applied?.length > 0 
          ? ` (${result.bonus_applied.length} bonus activos!)` 
          : '';
        showEarnNotification(userRole === 'artist' ? 'Artist' : 'Listener', earnedAmount, 'DYO' + bonusText);
        
        // ✅ Trigger balance update - dispara evento para que los hooks se actualicen
        if (blockchainContext?.refreshBalance) {
          await blockchainContext.refreshBalance().catch(() => {});
        }
        
        // También disparar evento personalizado para GlobalPlayer y otros componentes
        window.dispatchEvent(new CustomEvent('dujyo:balance-updated', {
          detail: {
            earned: earnedAmount,
            bonus_count: result.bonus_applied?.length || 0,
            new_balance: result.balance
          }
        }));
        
      } catch (error) {
        console.error('Error earning artist tokens:', error);
      }
    }, 10000); // ✅ 10 segundos

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTrack]);

  const stopStreamEarn = useCallback(() => {
    console.log('⏹️ Stopping Stream-to-Earn');
    
    if (artistTimerRef.current) {
      clearInterval(artistTimerRef.current);
      artistTimerRef.current = null;
    }
    
    if (listenerTimerRef.current) {
      clearInterval(listenerTimerRef.current);
      listenerTimerRef.current = null;
    }
    
    if (balanceRefreshRef.current) {
      clearInterval(balanceRefreshRef.current);
      balanceRefreshRef.current = null;
    }
  }, []);

  // Auto start/stop stream-earn when playing
  useEffect(() => {
    if (isPlaying && currentTrack && currentTrack.playerMode === 'music') {
      console.log('🎵 Starting stream-earn automatically');
      startStreamEarn();
    } else if (!isPlaying) {
      console.log('⏹️ Stopping stream-earn automatically');
      stopStreamEarn();
    }
    
    return () => {
      stopStreamEarn();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying, currentTrack?.id, currentTrack?.playerMode]);

  // Enhanced notification function with real-time updates
  // ✅ NOTIFICACIONES REDUCIDAS: Solo emitir eventos, no crear notificaciones visuales
  // Las notificaciones visuales son manejadas por StreamEarnDisplay y GlobalPlayer
  const showEarnNotification = useCallback((type: string, amount: number, currency: string) => {
    // Console log for debugging (reducido)
    console.log(`🎉 ${type} earned ${amount} ${currency}!`);
    
    // Emit event for stream earnings (StreamEarnDisplay escucha esto)
    emitEvent({
      type: 'STREAM_EARNED',
      data: { 
        type, 
        amount, 
        currency, 
        trackId: currentTrack?.id,
        trackTitle: currentTrack?.title 
      },
      source: 'PlayerContext'
    });
    
    // ✅ SYNC INMEDIATO CON BALANCE
    emitEvent({
      type: 'BALANCE_UPDATED',
      data: { force: true },
      source: 'PlayerContext'
    });
    
    // Update blockchain context immediately
    if (blockchainContext?.refreshBalance) {
      console.log('🔄 Triggering blockchain balance refresh...');
      blockchainContext.refreshBalance();
    }
    
    // ✅ REFRESH MANUAL INMEDIATO
    setTimeout(() => {
      if (blockchainContext?.refreshBalance) {
        console.log('🔄 Manual balance refresh after earning...');
        blockchainContext.refreshBalance();
      }
    }, 1000);
    
    // ❌ ELIMINADO: Notificaciones visuales redundantes
    // StreamEarnDisplay y GlobalPlayer ya muestran estas notificaciones
    // Browser notifications también eliminadas para reducir ruido
  }, [blockchainContext, emitEvent, currentTrack]);

  const playTrack = useCallback((track: Track) => {
    console.log('🎵 PlayerContext: playTrack called with:', track);
    setCurrentTrack(track);
    setIsPlaying(true);
    console.log('🎵 PlayerContext: Track set, isPlaying set to true');
    
    // ✅ DEBUG - Log state after setting
    setTimeout(() => {
      console.log('🎵 PlayerContext: State after playTrack:', {
        currentTrack: track ? `${track.title} (${track.id})` : 'null',
        isPlaying: true,
        timestamp: new Date().toISOString()
      });
    }, 100);
    
    // Start Stream-to-Earn when playing any content
    startStreamEarn();
  }, [startStreamEarn]);

  const pauseTrack = useCallback(() => {
    console.log('⏸️ PlayerContext: pauseTrack called');
    setIsPlaying(false);
    console.log('⏸️ PlayerContext: isPlaying set to false');
    stopStreamEarn(); // Stop earning when paused
  }, [stopStreamEarn]);

  const resumeTrack = useCallback(() => {
    if (currentTrack) {
      console.log('▶️ PlayerContext: resumeTrack called');
      setIsPlaying(true);
      console.log('▶️ PlayerContext: isPlaying set to true');
      // Resume Stream-to-Earn when resuming any content
      startStreamEarn();
    }
  }, [currentTrack, startStreamEarn]);

  const stopTrack = useCallback(() => {
    stopStreamEarn(); // Stop earning when stopping
    setCurrentTrack(null);
    setIsPlaying(false);
    // Clear localStorage when stopping
    localStorage.removeItem('dujyo_current_track');
    localStorage.removeItem('dujyo_is_playing');
  }, [stopStreamEarn]);

  const setPlaying = useCallback((playing: boolean) => {
    setIsPlaying(playing);
  }, []);

  // Funciones adicionales para compatibilidad con ExploreMusic
  const playContent = useCallback((title: string, artist: string, src: string, type: string) => {
    const track: Track = {
      id: `${title}-${artist}`,
      title,
      url: src,
      playerMode: type as 'music' | 'video' | 'gaming',
      artist,
      cover: 'default-cover.jpg'
    };
    playTrack(track);
  }, [playTrack]);

  const stopContent = useCallback(() => {
    stopTrack();
  }, [stopTrack]);

  // Playlist functions
  const loadPlaylist = useCallback((tracks: PlaylistTrack[], startIndex: number = 0) => {
    setCurrentPlaylist(tracks);
    setCurrentPlaylistIndex(startIndex);
    if (tracks.length > 0 && startIndex >= 0 && startIndex < tracks.length) {
      const track = tracks[startIndex];
      playTrack({
        id: track.id,
        title: track.title,
        url: track.url,
        playerMode: track.playerMode,
        artist: track.artist,
        cover: track.cover,
        duration: track.duration,
        genre: track.genre,
        artistFollowers: track.artistFollowers,
      });
    }
  }, [playTrack]);

  const nextTrack = useCallback(() => {
    if (currentPlaylist.length === 0) return;

    let nextIndex: number;
    
    if (isShuffled) {
      // Random track from playlist
      nextIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else {
      if (repeatMode === 'one') {
        // Repeat current track
        nextIndex = currentPlaylistIndex;
      } else if (repeatMode === 'all') {
        // Loop playlist
        nextIndex = (currentPlaylistIndex + 1) % currentPlaylist.length;
      } else {
        // Normal next
        nextIndex = currentPlaylistIndex + 1;
        if (nextIndex >= currentPlaylist.length) {
          // End of playlist
          stopTrack();
          return;
        }
      }
    }

    setCurrentPlaylistIndex(nextIndex);
    const track = currentPlaylist[nextIndex];
    playTrack({
      id: track.id,
      title: track.title,
      url: track.url,
      playerMode: track.playerMode,
      artist: track.artist,
      cover: track.cover,
      duration: track.duration,
      genre: track.genre,
      artistFollowers: track.artistFollowers,
    });
  }, [currentPlaylist, currentPlaylistIndex, isShuffled, repeatMode, playTrack, stopTrack]);

  const previousTrack = useCallback(() => {
    if (currentPlaylist.length === 0) return;

    let prevIndex: number;
    
    if (isShuffled) {
      // Random track from playlist
      prevIndex = Math.floor(Math.random() * currentPlaylist.length);
    } else {
      if (repeatMode === 'all') {
        // Loop playlist backwards
        prevIndex = currentPlaylistIndex - 1;
        if (prevIndex < 0) prevIndex = currentPlaylist.length - 1;
      } else {
        // Normal previous
        prevIndex = currentPlaylistIndex - 1;
        if (prevIndex < 0) {
          // Start of playlist
          prevIndex = 0;
        }
      }
    }

    setCurrentPlaylistIndex(prevIndex);
    const track = currentPlaylist[prevIndex];
    playTrack({
      id: track.id,
      title: track.title,
      url: track.url,
      playerMode: track.playerMode,
      artist: track.artist,
      cover: track.cover,
      duration: track.duration,
      genre: track.genre,
      artistFollowers: track.artistFollowers,
    });
  }, [currentPlaylist, currentPlaylistIndex, isShuffled, repeatMode, playTrack]);

  const toggleShuffle = useCallback(() => {
    setIsShuffled(prev => !prev);
  }, []);

  const playerState = {
    isPlaying,
    title: currentTrack?.title,
    artist: currentTrack?.artist,
    cover: currentTrack?.cover
  };

  const value: PlayerContextType = {
    currentTrack,
    isPlaying,
    currentPlaylist,
    currentPlaylistIndex,
    loadPlaylist,
    nextTrack,
    previousTrack,
    isShuffled,
    toggleShuffle,
    repeatMode,
    setRepeatMode,
    playerPosition,
    playTrack,
    pauseTrack,
    resumeTrack,
    stopTrack,
    setPlayerPosition,
    setPlaying,
    // Stream-to-Earn functionality
    streamEarnData,
    startStreamEarn,
    stopStreamEarn,
    playerState,
    playContent,
    stopContent,
  };

  return (
    <PlayerContext.Provider value={value}>
      {children}
    </PlayerContext.Provider>
  );
};
