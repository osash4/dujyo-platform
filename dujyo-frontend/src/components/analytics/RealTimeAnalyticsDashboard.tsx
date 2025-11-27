// Real-Time Analytics Dashboard - Connected to backend
import React from 'react';
import { motion } from 'framer-motion';
import { Users, TrendingUp, DollarSign, Activity, RefreshCw } from 'lucide-react';
import { useRealTimeAnalytics } from '../../hooks/useAnalytics';

const RealTimeAnalyticsDashboard: React.FC = () => {
  // Fetch real-time data with 30-second auto-refresh
  const { data, loading, error, refetch } = useRealTimeAnalytics(30000);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
        <p className="font-semibold">Error loading analytics</p>
        <p className="text-sm">{error.message}</p>
        <button
          onClick={refetch}
          className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const stats = [
    {
      label: 'Current Listeners',
      value: data.current_listeners.toLocaleString(),
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      label: 'Streams (Last Hour)',
      value: data.streams_last_hour.toLocaleString(),
      icon: Activity,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Revenue (Last Hour)',
      value: `$${data.revenue_last_hour.toFixed(2)}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Real-Time Analytics</h2>
        <button
          onClick={refetch}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {stats.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-lg shadow p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Trending Tracks */}
      {data.trending_tracks && data.trending_tracks.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Trending Tracks
          </h3>
          <div className="space-y-3">
            {data.trending_tracks.map((track, index) => (
              <div
                key={track.track_id}
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <span className="text-lg font-bold text-gray-400">#{index + 1}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{track.track_name}</p>
                    <p className="text-sm text-gray-600">
                      {track.streams.toLocaleString()} streams
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-green-600">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-semibold">{track.growth_rate.toFixed(1)}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Regions */}
      {data.active_regions && data.active_regions.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Active Regions
          </h3>
          <div className="flex flex-wrap gap-2">
            {data.active_regions.map((region) => (
              <span
                key={region}
                className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
              >
                {region}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Last Updated */}
      <p className="text-sm text-gray-500 text-center">
        Last updated: {new Date(data.timestamp * 1000).toLocaleTimeString()}
      </p>
    </div>
  );
};

export default RealTimeAnalyticsDashboard;

