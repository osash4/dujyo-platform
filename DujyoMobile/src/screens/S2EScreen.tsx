/**
 * S2E Screen - Stream-to-Earn dashboard with stats, charts, and limits
 * Integrated with S2EContext for real-time data
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useS2E } from '../contexts/S2EContext';
import { useAuth } from '../contexts/AuthContext';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function S2EScreen() {
  const { user } = useAuth();
  const {
    totalEarned,
    todayEarnings,
    weeklyEarnings,
    monthlyEarnings,
    dailyLimits,
    cooldownActive,
    cooldownEndsAt,
    refreshStats,
    refreshLimits,
    isTrackingActive,
    startBackgroundTracking,
    stopBackgroundTracking,
    isLoading,
  } = useS2E();

  const [refreshing, setRefreshing] = useState(false);
  const [weeklyData, setWeeklyData] = useState<number[]>([0, 0, 0, 0, 0, 0, 0]);

  useEffect(() => {
    loadWeeklyData();
  }, []);

  const loadWeeklyData = useCallback(async () => {
    // TODO: Fetch real weekly data from backend
    // For now, use mock data based on weeklyEarnings
    const mockData = Array.from({ length: 7 }, () => 
      Math.random() * (weeklyEarnings / 7) * 2
    );
    setWeeklyData(mockData);
  }, [weeklyEarnings]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refreshStats(), refreshLimits()]);
    await loadWeeklyData();
    setRefreshing(false);
  }, [refreshStats, refreshLimits, loadWeeklyData]);

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#8B5CF6" />
        <Text style={styles.loadingText}>Loading S2E data...</Text>
      </View>
    );
  }

  const sessionProgress = dailyLimits
    ? (dailyLimits.session_minutes.used / dailyLimits.session_minutes.limit) * 100
    : 0;

  const contentProgress = dailyLimits
    ? (dailyLimits.content_minutes.used / dailyLimits.content_minutes.limit) * 100
    : 0;

  const getProgressColor = (percentage: number): string => {
    if (percentage < 80) return '#10B981'; // green
    if (percentage < 95) return '#F59E0B'; // yellow
    return '#EF4444'; // red
  };

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#8B5CF6"
        />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Stream-to-Earn</Text>
          <Text style={styles.headerSubtitle}>
            {user?.username || 'Listener'}
          </Text>
        </View>
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>
            {isTrackingActive ? '🟢 Active' : '🔴 Paused'}
          </Text>
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{totalEarned.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Total DYO</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{todayEarnings.toFixed(2)}</Text>
          <Text style={styles.statLabel}>Today</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{weeklyEarnings.toFixed(2)}</Text>
          <Text style={styles.statLabel}>This Week</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{monthlyEarnings.toFixed(2)}</Text>
          <Text style={styles.statLabel}>This Month</Text>
        </View>
      </View>

      {/* Weekly Chart */}
      {weeklyData.some(v => v > 0) && (
        <View style={styles.chartContainer}>
          <Text style={styles.sectionTitle}>Weekly Earnings</Text>
          <LineChart
            data={{
              labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
              datasets: [{ data: weeklyData }],
            }}
            width={screenWidth - 40}
            height={200}
            chartConfig={{
              backgroundColor: '#000000',
              backgroundGradientFrom: '#1A1A1A',
              backgroundGradientTo: '#1A1A1A',
              decimalPlaces: 1,
              color: (opacity = 1) => `rgba(139, 92, 246, ${opacity})`,
              labelColor: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
              style: { borderRadius: 16 },
              propsForDots: {
                r: '6',
                strokeWidth: '2',
                stroke: '#8B5CF6',
              },
            }}
            bezier
            style={styles.chart}
          />
        </View>
      )}

      {/* Daily Limits */}
      {dailyLimits && (
        <View style={styles.limitsContainer}>
          <Text style={styles.sectionTitle}>Daily Limits</Text>

          {/* Session Limit */}
          <View style={styles.limitItem}>
            <View style={styles.limitHeader}>
              <Text style={styles.limitLabel}>Session Time</Text>
              <Text style={styles.limitValue}>
                {dailyLimits.session_minutes.used}/{dailyLimits.session_minutes.limit} min
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(sessionProgress, 100)}%`,
                    backgroundColor: getProgressColor(sessionProgress),
                  },
                ]}
              />
            </View>
            <Text style={styles.limitRemaining}>
              {dailyLimits.session_minutes.remaining} min remaining
            </Text>
          </View>

          {/* Content Limit */}
          <View style={styles.limitItem}>
            <View style={styles.limitHeader}>
              <Text style={styles.limitLabel}>Content Time</Text>
              <Text style={styles.limitValue}>
                {dailyLimits.content_minutes.used}/{dailyLimits.content_minutes.limit} min
              </Text>
            </View>
            <View style={styles.progressBarContainer}>
              <View
                style={[
                  styles.progressBar,
                  {
                    width: `${Math.min(contentProgress, 100)}%`,
                    backgroundColor: getProgressColor(contentProgress),
                  },
                ]}
              />
            </View>
            <Text style={styles.limitRemaining}>
              {dailyLimits.content_minutes.remaining} min remaining
            </Text>
          </View>
        </View>
      )}

      {/* Cooldown Warning */}
      {cooldownActive && (
        <View style={styles.cooldownWarning}>
          <Text style={styles.cooldownText}>
            ⏸️ Cooldown active
          </Text>
          {cooldownEndsAt && (
            <Text style={styles.cooldownSubtext}>
              Resume at {new Date(cooldownEndsAt).toLocaleTimeString()}
            </Text>
          )}
        </View>
      )}

      {/* Tracking Toggle */}
      <TouchableOpacity
        style={[
          styles.trackingButton,
          { backgroundColor: isTrackingActive ? '#EF4444' : '#10B981' },
        ]}
        onPress={isTrackingActive ? stopBackgroundTracking : startBackgroundTracking}
      >
        <Text style={styles.trackingButtonText}>
          {isTrackingActive ? '⏸ Pause Tracking' : '▶ Resume Tracking'}
        </Text>
      </TouchableOpacity>

      {/* Action Buttons */}
      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>📊 History</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>💰 Withdraw</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionButton}>
          <Text style={styles.actionButtonText}>👥 Invite</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

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
  header: {
    padding: 20,
    paddingTop: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 4,
  },
  statusBadge: {
    backgroundColor: '#1A1A1A',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 10,
  },
  statCard: {
    width: '47%',
    backgroundColor: '#1A1A1A',
    borderRadius: 12,
    padding: 16,
    margin: 6,
  },
  statValue: {
    color: '#8B5CF6',
    fontSize: 24,
    fontWeight: 'bold',
  },
  statLabel: {
    color: '#AAAAAA',
    fontSize: 14,
    marginTop: 4,
  },
  chartContainer: {
    backgroundColor: '#1A1A1A',
    margin: 20,
    padding: 16,
    borderRadius: 12,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  chart: {
    borderRadius: 16,
  },
  limitsContainer: {
    backgroundColor: '#1A1A1A',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
  },
  limitItem: {
    marginBottom: 16,
  },
  limitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  limitLabel: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
  limitValue: {
    color: '#AAAAAA',
    fontSize: 14,
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#333333',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 4,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  limitRemaining: {
    color: '#666666',
    fontSize: 12,
  },
  cooldownWarning: {
    backgroundColor: 'rgba(239, 68, 68, 0.1)',
    marginHorizontal: 20,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EF4444',
    marginBottom: 12,
  },
  cooldownText: {
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  cooldownSubtext: {
    color: '#EF4444',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 4,
  },
  trackingButton: {
    marginHorizontal: 20,
    marginVertical: 12,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  trackingButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 40,
  },
  actionButton: {
    backgroundColor: '#333333',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    minWidth: 100,
    alignItems: 'center',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '500',
  },
});
