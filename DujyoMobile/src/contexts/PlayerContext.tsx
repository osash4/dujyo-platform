/**
 * Player Context - Audio playback state management for mobile
 * Integrates with TrackPlayer and S2E tracking
 */

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import TrackPlayer, {
  Event,
  State,
  usePlaybackState,
  useProgress,
  useTrackPlayerEvents,
} from 'react-native-track-player';
import { useS2E } from './S2EContext';
import { Track, getCurrentTrack, playTrack as playTrackService, addTracksToQueue } from '../services/audio/TrackPlayerService';

export interface PlayerTrack extends Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  genre?: string;
}

interface PlayerContextType {
  // Estado
  currentTrack: PlayerTrack | null;
  isPlaying: boolean;
  queue: PlayerTrack[];
  position: number;
  duration: number;

  // Métodos
  playTrack: (track: PlayerTrack) => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  seekTo: (position: number) => Promise<void>;
  addToQueue: (tracks: PlayerTrack[]) => Promise<void>;
  clearQueue: () => Promise<void>;
  skipToNext: () => Promise<void>;
  skipToPrevious: () => Promise<void>;

  // S2E Integration
  startS2ESession: () => void;
  stopS2ESession: () => void;
}

const PlayerContext = createContext<PlayerContextType | undefined>(undefined);

export const PlayerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { trackS2EEarning } = useS2E();
  const [currentTrack, setCurrentTrack] = useState<PlayerTrack | null>(null);
  const [queue, setQueue] = useState<PlayerTrack[]>([]);
  const playbackState = usePlaybackState();
  const progress = useProgress();

  const isPlaying = playbackState.state === State.Playing;

  // S2E Earnings tracking - send tick every 10 seconds while playing
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;

    if (isPlaying && currentTrack) {
      interval = setInterval(async () => {
        try {
          // Send S2E tick (10 seconds of listening)
          await trackS2EEarning(currentTrack.id, 10, currentTrack.title, currentTrack.artist);
        } catch (error) {
          console.error('Error tracking S2E earning:', error);
        }
      }, 10000); // Every 10 seconds
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [isPlaying, currentTrack, trackS2EEarning]);

  // Listen to track changes
  useTrackPlayerEvents([Event.PlaybackTrackChanged], async (event) => {
    if (event.type === Event.PlaybackTrackChanged && event.nextTrack != null) {
      try {
        const track = await getCurrentTrack();
        if (track) {
          setCurrentTrack(track as PlayerTrack);
        }
      } catch (error) {
        console.error('Error getting current track:', error);
      }
    }
  });

  const playTrack = useCallback(async (track: PlayerTrack) => {
    try {
      await playTrackService(track);
      setCurrentTrack(track);
    } catch (error) {
      console.error('Error playing track:', error);
      throw error;
    }
  }, []);

  const pause = useCallback(async () => {
    try {
      await TrackPlayer.pause();
    } catch (error) {
      console.error('Error pausing:', error);
    }
  }, []);

  const resume = useCallback(async () => {
    try {
      await TrackPlayer.play();
    } catch (error) {
      console.error('Error resuming:', error);
    }
  }, []);

  const seekTo = useCallback(async (position: number) => {
    try {
      await TrackPlayer.seekTo(position);
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, []);

  const addToQueue = useCallback(async (tracks: PlayerTrack[]) => {
    try {
      await addTracksToQueue(tracks);
      setQueue(prev => [...prev, ...tracks]);
    } catch (error) {
      console.error('Error adding to queue:', error);
    }
  }, []);

  const clearQueue = useCallback(async () => {
    try {
      await TrackPlayer.reset();
      setQueue([]);
      setCurrentTrack(null);
    } catch (error) {
      console.error('Error clearing queue:', error);
    }
  }, []);

  const skipToNext = useCallback(async () => {
    try {
      await TrackPlayer.skipToNext();
    } catch (error) {
      console.error('Error skipping to next:', error);
    }
  }, []);

  const skipToPrevious = useCallback(async () => {
    try {
      await TrackPlayer.skipToPrevious();
    } catch (error) {
      console.error('Error skipping to previous:', error);
    }
  }, []);

  const startS2ESession = useCallback(() => {
    // S2E tracking starts automatically when playing
    // This is just for explicit control if needed
  }, []);

  const stopS2ESession = useCallback(() => {
    // S2E tracking stops automatically when paused
    // This is just for explicit control if needed
  }, []);

  const value: PlayerContextType = {
    currentTrack,
    isPlaying,
    queue,
    position: progress.position,
    duration: progress.duration,
    playTrack,
    pause,
    resume,
    seekTo,
    addToQueue,
    clearQueue,
    skipToNext,
    skipToPrevious,
    startS2ESession,
    stopS2ESession,
  };

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>;
};

export const usePlayer = (): PlayerContextType => {
  const context = useContext(PlayerContext);
  if (!context) {
    throw new Error('usePlayer must be used within PlayerProvider');
  }
  return context;
};

