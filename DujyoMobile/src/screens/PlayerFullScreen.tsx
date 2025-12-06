/**
 * Player Full Screen - Complete audio player with controls
 * Integrated with PlayerContext and TrackPlayer
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Image,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlayer } from '../contexts/PlayerContext';
import TrackPlayer, { useProgress } from 'react-native-track-player';
import Slider from '@react-native-community/slider';

export default function PlayerFullScreen() {
  const navigation = useNavigation();
  const {
    currentTrack,
    isPlaying,
    pause,
    resume,
    skipToNext,
    skipToPrevious,
    seekTo,
  } = usePlayer();
  const progress = useProgress();

  if (!currentTrack) {
    return (
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.closeButtonText}>✕</Text>
        </TouchableOpacity>
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateEmoji}>🎵</Text>
          <Text style={styles.emptyStateText}>No track playing</Text>
        </View>
      </View>
    );
  }

  const togglePlayback = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await resume();
    }
  };

  const handleSeek = async (value: number) => {
    await seekTo(value);
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <ScrollView style={styles.container}>
      {/* Close Button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.closeButtonText}>✕</Text>
      </TouchableOpacity>

      {/* Album Art */}
      <View style={styles.albumArtContainer}>
        {currentTrack.artwork ? (
          <Image
            source={{ uri: currentTrack.artwork }}
            style={styles.albumArt}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.albumArtPlaceholder}>
            <Text style={styles.albumArtEmoji}>🎵</Text>
          </View>
        )}
      </View>

      {/* Track Info */}
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={2}>
          {currentTrack.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {currentTrack.artist}
        </Text>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <Slider
          style={styles.slider}
          minimumValue={0}
          maximumValue={progress.duration || 1}
          value={progress.position || 0}
          onSlidingComplete={handleSeek}
          minimumTrackTintColor="#8B5CF6"
          maximumTrackTintColor="#333333"
          thumbTintColor="#8B5CF6"
        />
        <View style={styles.timeContainer}>
          <Text style={styles.timeText}>{formatTime(progress.position || 0)}</Text>
          <Text style={styles.timeText}>{formatTime(progress.duration || 0)}</Text>
        </View>
      </View>

      {/* Main Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={styles.controlButton}
          onPress={skipToPrevious}
        >
          <Text style={styles.controlButtonText}>⏮</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.playButton}
          onPress={togglePlayback}
        >
          <Text style={styles.playButtonText}>
            {isPlaying ? '⏸' : '▶️'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={skipToNext}
        >
          <Text style={styles.controlButtonText}>⏭</Text>
        </TouchableOpacity>
      </View>

      {/* Extra Controls */}
      <View style={styles.extraControls}>
        <TouchableOpacity style={styles.extraButton}>
          <Text style={styles.extraButtonText}>🔀</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.extraButton}>
          <Text style={styles.extraButtonText}>🔁</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.extraButton}>
          <Text style={styles.extraButtonText}>💾</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.extraButton}>
          <Text style={styles.extraButtonText}>📤</Text>
        </TouchableOpacity>
      </View>

      {/* Queue Section */}
      <View style={styles.queueSection}>
        <Text style={styles.sectionTitle}>Up Next</Text>
        <View style={styles.queuePlaceholder}>
          <Text style={styles.queuePlaceholderText}>
            Queue is empty
          </Text>
        </View>
      </View>

      {/* Lyrics Section */}
      <View style={styles.lyricsSection}>
        <Text style={styles.sectionTitle}>Lyrics</Text>
        <View style={styles.lyricsPlaceholder}>
          <Text style={styles.lyricsPlaceholderText}>
            Lyrics loading...
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 100,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 18,
    textAlign: 'center',
  },
  albumArtContainer: {
    alignItems: 'center',
    marginTop: 60,
    marginBottom: 40,
  },
  albumArt: {
    width: 300,
    height: 300,
    borderRadius: 12,
  },
  albumArtPlaceholder: {
    width: 300,
    height: 300,
    backgroundColor: '#8B5CF6',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  albumArtEmoji: {
    fontSize: 120,
  },
  trackInfo: {
    alignItems: 'center',
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  trackArtist: {
    color: '#AAAAAA',
    fontSize: 18,
    marginTop: 8,
    textAlign: 'center',
  },
  progressContainer: {
    paddingHorizontal: 30,
    marginBottom: 40,
  },
  slider: {
    width: '100%',
    height: 40,
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
  },
  timeText: {
    color: '#AAAAAA',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 40,
  },
  controlButton: {
    padding: 20,
  },
  controlButtonText: {
    fontSize: 30,
    color: '#FFFFFF',
  },
  playButton: {
    backgroundColor: '#8B5CF6',
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 30,
    shadowColor: '#8B5CF6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 8,
  },
  playButtonText: {
    fontSize: 40,
    color: '#FFFFFF',
  },
  extraControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 40,
  },
  extraButton: {
    paddingHorizontal: 20,
  },
  extraButtonText: {
    fontSize: 24,
    color: '#AAAAAA',
  },
  queueSection: {
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  lyricsSection: {
    paddingHorizontal: 20,
    marginBottom: 100,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  queuePlaceholder: {
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
  },
  queuePlaceholderText: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
  },
  lyricsPlaceholder: {
    padding: 20,
    backgroundColor: '#1A1A1A',
    borderRadius: 8,
  },
  lyricsPlaceholderText: {
    color: '#AAAAAA',
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
  },
});
