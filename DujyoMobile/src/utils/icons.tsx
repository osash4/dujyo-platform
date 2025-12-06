/**
 * Icon components for React Native
 * Using simple SVG-like components since lucide-react-native may not be available
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

// Simple icon components (can be replaced with react-native-vector-icons later)
export const HomeIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>🏠</Text>
  </View>
);

export const SearchIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>🔍</Text>
  </View>
);

export const CoinsIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>💰</Text>
  </View>
);

export const UserIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>👤</Text>
  </View>
);

export const MusicIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>🎵</Text>
  </View>
);

export const TrendingUpIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>📈</Text>
  </View>
);

export const ClockIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>⏰</Text>
  </View>
);

export const CoinsIconLarge = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>💎</Text>
  </View>
);

export const BarChartIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>📊</Text>
  </View>
);

export const AlertTriangleIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>⚠️</Text>
  </View>
);

export const XIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.5 }]}>✕</Text>
  </View>
);

export const PlayIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>▶</Text>
  </View>
);

export const PauseIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>⏸</Text>
  </View>
);

export const SkipBackIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>⏮</Text>
  </View>
);

export const SkipForwardIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>⏭</Text>
  </View>
);

export const ShuffleIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>🔀</Text>
  </View>
);

export const RepeatIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>🔁</Text>
  </View>
);

export const SettingsIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>⚙️</Text>
  </View>
);

export const WalletIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>💳</Text>
  </View>
);

export const LogOutIcon = ({ size = 24, color = '#FFFFFF' }: { size?: number; color?: string }) => (
  <View style={[styles.iconContainer, { width: size, height: size }]}>
    <Text style={[styles.iconText, { color, fontSize: size * 0.6 }]}>🚪</Text>
  </View>
);

const styles = {
  iconContainer: {
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
  },
  iconText: {
    textAlign: 'center' as const,
  },
};

