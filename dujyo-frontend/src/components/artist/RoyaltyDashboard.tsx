// src/components/artist/RoyaltyDashboard.tsx
import React, { useState, useEffect } from 'react';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { useAuth } from '../../auth/AuthContext';
import { DollarSign, TrendingUp, Clock, CheckCircle, XCircle } from 'lucide-react';

interface RoyaltyData {
  artist_id: string;
  artist_name: string;
  total_earned: number;
  pending_payout: number;
  last_payout_date: string | null;
  payment_history: Array<{
    payment_id: string;
    amount: number;
    currency: string;
    status: string;
    date: string;
    source: string;
    transaction_hash: string | null;
  }>;
  cross_platform_earnings: {
    spotify: { total_earned: number; streams: number };
    apple_music: { total_earned: number; streams: number };
    youtube: { total_earned: number; streams: number };
    dujyo: { total_earned: number; streams: number };
    total: number;
  };
  revenue_streams: Array<{
    stream_type: string;
    amount: number;
    percentage: number;
    transactions: number;
  }>;
}

interface RoyaltyDashboardProps {
  stats?: any; // Legacy prop for compatibility
}

const RoyaltyDashboard: React.FC<RoyaltyDashboardProps> = ({ stats }) => {
  const { user } = useAuth();
  const [royaltyData, setRoyaltyData] = useState<RoyaltyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user?.uid) {
      fetchRoyaltyData();
    }
  }, [user?.uid]);

  const fetchRoyaltyData = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('jwt_token');
      if (!token || !user?.uid) {
        throw new Error('No authentication token or user ID found');
      }

      const apiBaseUrl = getApiBaseUrl();
      const response = await fetch(`${apiBaseUrl}/api/v1/royalties/artist/${user.uid}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch royalties: ${response.status}`);
      }

      const data = await response.json();
      setRoyaltyData(data);
    } catch (err) {
      console.error('Error fetching royalty data:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(amount);
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        <span className="ml-3 text-gray-300">Loading royalties...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
        <p>Error loading royalties: {error}</p>
        <button
          onClick={fetchRoyaltyData}
          className="mt-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!royaltyData) {
    return (
      <div className="text-center p-8 text-gray-400">
        <p>No royalty data available yet.</p>
        <p className="text-sm mt-2">Start uploading and streaming content to earn royalties!</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Royalties Dashboard</h2>
        <p className="text-gray-400">Track your earnings across all platforms</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gradient-to-r from-green-600 to-green-700 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Total Earned</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(royaltyData.total_earned)}</p>
            </div>
            <DollarSign className="w-12 h-12 text-green-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-yellow-600 to-yellow-700 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-yellow-100 text-sm font-medium">Pending Payout</p>
              <p className="text-3xl font-bold text-white">{formatCurrency(royaltyData.pending_payout)}</p>
            </div>
            <Clock className="w-12 h-12 text-yellow-200" />
          </div>
        </div>

        <div className="bg-gradient-to-r from-orange-600 to-blue-700 p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Last Payout</p>
              <p className="text-xl font-bold text-white">{formatDate(royaltyData.last_payout_date)}</p>
            </div>
            <TrendingUp className="w-12 h-12 text-blue-200" />
          </div>
        </div>
      </div>

      {/* Cross-Platform Earnings */}
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-4">Cross-Platform Earnings</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Spotify</p>
            <p className="text-white font-bold">{formatCurrency(royaltyData.cross_platform_earnings.spotify.total_earned)}</p>
            <p className="text-gray-500 text-xs">{royaltyData.cross_platform_earnings.spotify.streams.toLocaleString()} streams</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">Apple Music</p>
            <p className="text-white font-bold">{formatCurrency(royaltyData.cross_platform_earnings.apple_music.total_earned)}</p>
            <p className="text-gray-500 text-xs">{royaltyData.cross_platform_earnings.apple_music.streams.toLocaleString()} streams</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">YouTube</p>
            <p className="text-white font-bold">{formatCurrency(royaltyData.cross_platform_earnings.youtube.total_earned)}</p>
            <p className="text-gray-500 text-xs">{royaltyData.cross_platform_earnings.youtube.streams.toLocaleString()} streams</p>
          </div>
          <div className="bg-gray-700 p-4 rounded-lg">
            <p className="text-gray-400 text-sm">DUJYO</p>
            <p className="text-white font-bold">{formatCurrency(royaltyData.cross_platform_earnings.dujyo.total_earned)}</p>
            <p className="text-gray-500 text-xs">{royaltyData.cross_platform_earnings.dujyo.streams.toLocaleString()} streams</p>
          </div>
        </div>
      </div>

      {/* Payment History */}
      <div className="bg-gray-800 p-6 rounded-xl">
        <h3 className="text-xl font-bold text-white mb-4">Payment History</h3>
        <div className="space-y-3">
          {royaltyData.payment_history.length > 0 ? (
            royaltyData.payment_history.map((payment) => (
              <div key={payment.payment_id} className="bg-gray-700 p-4 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {payment.status === 'completed' ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : payment.status === 'pending' ? (
                    <Clock className="w-5 h-5 text-yellow-400" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-400" />
                  )}
                  <div>
                    <p className="text-white font-medium">{formatCurrency(payment.amount, payment.currency)}</p>
                    <p className="text-gray-400 text-sm">
                      {payment.source} • {formatDate(payment.date)}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  payment.status === 'completed' ? 'bg-green-500/20 text-green-400' :
                  payment.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  'bg-red-500/20 text-red-400'
                }`}>
                  {payment.status}
                </span>
              </div>
            ))
          ) : (
            <p className="text-gray-400 text-center py-8">No payment history yet</p>
          )}
        </div>
      </div>
    </div>
  );
};

export { RoyaltyDashboard };
