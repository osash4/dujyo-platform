// Royalties Overview - Connected to backend
import React from 'react';
import { motion } from 'framer-motion';
import { DollarSign, TrendingUp, Clock, CheckCircle, RefreshCw } from 'lucide-react';
import { useArtistRoyalties } from '../../hooks/useRoyalties';
import { useAuth } from '../../auth/AuthContext';

interface Props {
  artistId?: string;
}

const RoyaltiesOverview: React.FC<Props> = ({ artistId }) => {
  const { user } = useAuth();
  const targetArtistId = artistId || user?.address || null;
  
  const { data, loading, error, refetch } = useArtistRoyalties(targetArtistId);

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
        <p className="font-semibold">Error loading royalties</p>
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
      label: 'Total Earned',
      value: `$${data.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: DollarSign,
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      label: 'Pending Payout',
      value: `$${data.pending_payout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      icon: Clock,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      label: 'Last Payout',
      value: data.last_payout_date || 'N/A',
      icon: CheckCircle,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Royalties Overview</h2>
          <p className="text-sm text-gray-600 mt-1">{data.artist_name}</p>
        </div>
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
                <p className="text-2xl font-bold text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                <stat.icon className={`w-6 h-6 ${stat.color}`} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Cross-Platform Earnings */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Cross-Platform Earnings
        </h3>
        <div className="space-y-4">
          {Object.entries(data.cross_platform_earnings).map(([platform, earnings]) => {
            // Skip the 'total' entry
            if (platform === 'total' || typeof earnings === 'number') return null;

            const platformEarning = earnings as { platform_name: string; total_earned: number; streams: number; rate_per_stream: number; last_sync: string };
            
            return (
              <div key={platform} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-semibold text-gray-900">{platformEarning.platform_name}</p>
                  <p className="text-sm text-gray-600">
                    {platformEarning.streams.toLocaleString()} streams
                  </p>
                  <p className="text-xs text-gray-500">
                    Rate: ${platformEarning.rate_per_stream.toFixed(4)}/stream
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-gray-900">
                    ${platformEarning.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">
                    Last sync: {platformEarning.last_sync}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Revenue Streams */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Revenue Streams
        </h3>
        <div className="space-y-3">
          {data.revenue_streams.map((stream) => (
            <div key={stream.stream_type} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-purple-600 rounded-full"></div>
                <div>
                  <p className="font-semibold text-gray-900 capitalize">{stream.stream_type}</p>
                  <p className="text-sm text-gray-600">
                    {stream.transactions.toLocaleString()} transactions
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">
                  ${stream.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-sm text-gray-600">{stream.percentage.toFixed(1)}%</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Recent Payments
        </h3>
        <div className="space-y-3">
          {data.payment_history.slice(0, 5).map((payment) => (
            <div key={payment.payment_id} className="flex items-center justify-between p-3 border-b border-gray-100 last:border-0">
              <div>
                <p className="font-semibold text-gray-900">{payment.source}</p>
                <p className="text-sm text-gray-600">{payment.date}</p>
                {payment.transaction_hash && (
                  <p className="text-xs text-gray-500 font-mono">
                    {payment.transaction_hash.slice(0, 10)}...
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="font-bold text-gray-900">
                  ${payment.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <span className={`text-xs px-2 py-1 rounded-full ${
                  payment.status === 'completed' 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {payment.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default RoyaltiesOverview;

