/**
 * Home Screen - Main feed with trending, continue listening, and recommendations
 * Integrated with PlayerContext for playback
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  Image,
  ActivityIndicator,
} from 'react-native';
import { usePlayer } from '../contexts/PlayerContext';
import { useAuth } from '../contexts/AuthContext';
import apiClient from '../services/api';

interface Track {
  content_id: string;
  title: string;
  artist_name: string;
  cover_image_url?: string;
  duration_seconds?: number;
  stream_url?: string;
}

export default function HomeScreen() {
  const { user } = useAuth();
  const { playTrack } = usePlayer();
  const [trending, setTrending] = useState<Track[]>([]);
  const [continueListening, setContinueListening] = useState<Track[]>([]);
  const [recommended, setRecommended] = useState<Track[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load trending content
      try {
        const trendingResponse = await apiClient.get('/api/v1/trending');
        setTrending(trendingResponse.content || []);
      } catch (error) {
        console.error('Error loading trending:', error);
        setTrending([]);
      }

      // Load continue listening (history) - placeholder for now
      try {
        // TODO: Implement listening history endpoint
        // const historyResponse = await apiClient.get('/api/v1/users/listening-history');
        // setContinueListening(historyResponse.data || []);
        setContinueListening([]);
      } catch (error) {
        console.error('Error loading history:', error);
        setContinueListening([]);
      }

      // Load recommendations - placeholder for now
      try {
        // TODO: Implement recommendations endpoint
        // const recommendedResponse = await apiClient.get('/api/v1/recommendations');
        // setRecommended(recommendedResponse.data || []);
        setRecommended([]);
      } catch (error) {
        console.error('Error loading recommendations:', error);
        setRecommended([]);
      }
    } catch (error) {
      console.error('Error loading home data:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  }, [loadData]);

  const handlePlayTrack = useCallback(async (track: Track) => {
    try {
      // Convert API track to PlayerTrack format
      const playerTrack = {
        id: track.content_id,
        url: track.stream_url || '',
        title: track.title,
        artist: track.artist_name,
        artwork: track.cover_image_url,
        duration: track.duration_seconds,
      };
      await playTrack(playerTrack);
    } catch (error) {
      console.error('Error playing track:', error);
    }
  }, [playTrack]);

  const renderTrackItem = ({ item }: { item: Track }) => (
    <TouchableOpacity
      style={styles.trackItem}
      onPress={() => handlePlayTrack(item)}
      activeOpacity={0.7}
    >
      <View style={styles.trackThumbnail}>
        {item.cover_image_url ? (
          <Image
            source={{ uri: item.cover_image_url }}
            style={styles.trackImage}
            resizeMode="cover"
          />
        ) : (
          <View style={styles.trackImagePlaceholder}>
            <Text style={styles.trackImageEmoji}>🎵</Text>
          </View>
        )}
      </View>
      <View style={styles.trackInfo}>
        <Text style={styles.trackTitle} numberOfLines={1}>
          {item.title}
        </Text>
        <Text style={styles.trackArtist} numberOfLines={1}>
          {item.artist_name}
        </Text>
      </View>
      {item.duration_seconds && (
        <Text style={styles.trackDuration}>
          {formatDuration(item.duration_seconds)}
        </Text>
      )}
    </TouchableOpacity>
  );

  const renderSection = (title: string, data: Track[]) => {
    if (data.length === 0) return null;

    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <FlatList
          data={data}
          renderItem={renderTrackItem}
          keyExtractor={(item) => item.content_id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.horizontalList}
        />
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <FlatList
      style={styles.container}
      data={[]} // Empty data for single list
      renderItem={null}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#8B5CF6"
        />
      }
      ListHeaderComponent={
        <View>
          {/* Welcome message */}
          <View style={styles.welcomeSection}>
            <Text style={styles.welcomeText}>
              Welcome back, {user?.username || 'Listener'} 👋
            </Text>
            <Text style={styles.subtitle}>
              What would you like to listen to today?
            </Text>
          </View>

          {/* Continue Listening */}
          {renderSection('Continue Listening', continueListening)}

          {/* Trending */}
          {renderSection('Trending Now', trending)}

          {/* Recommended */}
          {renderSection('Recommended For You', recommended)}

          {/* Empty state */}
          {trending.length === 0 && continueListening.length === 0 && recommended.length === 0 && (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateEmoji}>🎵</Text>
              <Text style={styles.emptyStateText}>No content available</Text>
              <Text style={styles.emptyStateSubtext}>
                Pull down to refresh
              </Text>
            </View>
          )}
        </View>
      }
    />
  );
}

const formatDuration = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
  },
  welcomeSection: {
    padding: 20,
    paddingTop: 40,
  },
  welcomeText: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#AAAAAA',
    fontSize: 16,
    marginTop: 8,
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '600',
    marginLeft: 20,
    marginBottom: 12,
  },
  horizontalList: {
    paddingRight: 20,
  },
  trackItem: {
    width: 160,
    marginLeft: 20,
  },
  trackThumbnail: {
    width: 160,
    height: 160,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  trackImage: {
    width: '100%',
    height: '100%',
  },
  trackImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#8B5CF6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  trackImageEmoji: {
    fontSize: 60,
  },
  trackInfo: {
    paddingHorizontal: 4,
  },
  trackTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  trackArtist: {
    color: '#AAAAAA',
    fontSize: 12,
    marginTop: 2,
  },
  trackDuration: {
    color: '#666666',
    fontSize: 11,
    marginTop: 4,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyStateEmoji: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyStateText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    color: '#AAAAAA',
    fontSize: 14,
    textAlign: 'center',
  },
});
