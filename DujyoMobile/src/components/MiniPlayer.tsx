/**
 * Mini Player Component - Bottom player bar
 * Shows current track and basic controls
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { usePlayer } from '../contexts/PlayerContext';
import { PlayIcon, PauseIcon } from '../utils/icons';

export const MiniPlayer: React.FC = () => {
  const { currentTrack, isPlaying, pause, resume } = usePlayer();
  const navigation = useNavigation();
  const progress = usePlayer().position;
  const duration = usePlayer().duration;

  if (!currentTrack) return null;

  const handlePress = () => {
    // @ts-ignore - Navigation type
    navigation.navigate('PlayerFullScreen');
  };

  const togglePlayback = async () => {
    if (isPlaying) {
      await pause();
    } else {
      await resume();
    }
  };

  const progressPercent = progress.duration > 0 ? (progress.position / progress.duration) * 100 : 0;

  return (
    <TouchableOpacity style={styles.container} onPress={handlePress} activeOpacity={0.8}>
      <View style={styles.content}>
        {/* Thumbnail */}
        <View style={styles.thumbnail}>
          <Text style={styles.thumbnailEmoji}>🎵</Text>
        </View>

        {/* Track info */}
        <View style={styles.trackInfo}>
          <Text style={styles.title} numberOfLines={1}>
            {currentTrack.title}
          </Text>
          <Text style={styles.artist} numberOfLines={1}>
            {currentTrack.artist}
          </Text>
        </View>

        {/* Play/Pause button */}
        <TouchableOpacity onPress={togglePlayback} style={styles.playButton}>
          {isPlaying ? (
            <PauseIcon size={24} color="#FFFFFF" />
          ) : (
            <PlayIcon size={24} color="#FFFFFF" />
          )}
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBarContainer}>
        <View style={[styles.progressBar, { width: `${Math.min(progressPercent, 100)}%` }]} />
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1A1A1A',
    borderTopWidth: 1,
    borderTopColor: '#333333',
    paddingBottom: 0,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  thumbnail: {
    width: 40,
    height: 40,
    backgroundColor: '#8B5CF6',
    borderRadius: 4,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  thumbnailEmoji: {
    fontSize: 20,
  },
  trackInfo: {
    flex: 1,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 2,
  },
  artist: {
    color: '#9CA3AF',
    fontSize: 12,
  },
  playButton: {
    padding: 8,
    marginLeft: 8,
  },
  progressBarContainer: {
    height: 2,
    backgroundColor: '#333333',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#8B5CF6',
  },
});

