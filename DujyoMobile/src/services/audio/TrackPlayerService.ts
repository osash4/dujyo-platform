/**
 * TrackPlayer Service - Background Audio Playback
 * Handles audio playback with background support
 */

import TrackPlayer, {
  Capability,
  RatingType,
  RepeatMode,
  AppKilledPlaybackBehavior,
  State,
} from 'react-native-track-player';

export interface Track {
  id: string;
  url: string;
  title: string;
  artist: string;
  artwork?: string;
  duration?: number;
  genre?: string;
}

/**
 * Setup TrackPlayer with all capabilities
 */
export const setupPlayer = async (): Promise<void> => {
  try {
    await TrackPlayer.setupPlayer({
      // Android specific
      androidAudioContentType: 'music',
      androidAudioFocus: 'gain',
      // iOS specific
      iosCategory: 'playback',
      iosCategoryMode: 'spokenAudio',
    });

    await TrackPlayer.updateOptions({
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
        Capability.Stop,
      ],
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
      ratingType: RatingType.Heart,
      appKilledPlaybackBehavior: AppKilledPlaybackBehavior.ContinuePlayback,
    });

    console.log('✅ TrackPlayer setup complete');
  } catch (error) {
    console.error('❌ Error setting up TrackPlayer:', error);
    throw error;
  }
};

/**
 * Add track to queue
 */
export const addTrack = async (track: Track): Promise<void> => {
  try {
    await TrackPlayer.add({
      id: track.id,
      url: track.url,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      duration: track.duration,
      genre: track.genre,
    });
  } catch (error) {
    console.error('Error adding track:', error);
    throw error;
  }
};

/**
 * Play track
 */
export const playTrack = async (track: Track): Promise<void> => {
  try {
    // Reset queue and add new track
    await TrackPlayer.reset();
    await addTrack(track);
    await TrackPlayer.play();
  } catch (error) {
    console.error('Error playing track:', error);
    throw error;
  }
};

/**
 * Add multiple tracks to queue
 */
export const addTracksToQueue = async (tracks: Track[]): Promise<void> => {
  try {
    const trackData = tracks.map(track => ({
      id: track.id,
      url: track.url,
      title: track.title,
      artist: track.artist,
      artwork: track.artwork,
      duration: track.duration,
      genre: track.genre,
    }));
    await TrackPlayer.add(trackData);
  } catch (error) {
    console.error('Error adding tracks to queue:', error);
    throw error;
  }
};

/**
 * Get current track
 */
export const getCurrentTrack = async (): Promise<Track | null> => {
  try {
    const trackIndex = await TrackPlayer.getActiveTrackIndex();
    if (trackIndex === null || trackIndex === undefined) {
      return null;
    }
    const track = await TrackPlayer.getTrack(trackIndex);
    if (!track) return null;

    return {
      id: track.id || '',
      url: track.url || '',
      title: track.title || '',
      artist: track.artist || '',
      artwork: track.artwork,
      duration: track.duration,
      genre: track.genre,
    };
  } catch (error) {
    console.error('Error getting current track:', error);
    return null;
  }
};

/**
 * Get player state
 */
export const getPlayerState = async (): Promise<State> => {
  try {
    return await TrackPlayer.getState();
  } catch (error) {
    console.error('Error getting player state:', error);
    return State.None;
  }
};

/**
 * Cleanup TrackPlayer
 */
export const cleanupPlayer = async (): Promise<void> => {
  try {
    await TrackPlayer.reset();
    await TrackPlayer.destroy();
  } catch (error) {
    console.error('Error cleaning up player:', error);
  }
};

