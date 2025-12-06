import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  TrendingUp, 
  Coins, 
  RefreshCw,
  Download,
  Key,
  AlertTriangle,
  BarChart3
} from 'lucide-react';
import { getApiBaseUrl } from '../../utils/apiConfig';
import { useAuth } from '../../auth/AuthContext';

interface S2EAdminStats {
  total_users: number;
  active_users_today: number;
  dyo_distributed: number;
  pool_remaining: number;
  pool_total: number;
  pool_remaining_percent: number;
}

interface TopEarner {
  user_address: string;
  total_earned: number;
  streams_count: number;
  minutes_listened: number;
}

const S2EAdminPanel: React.FC = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState<S2EAdminStats | null>(null);
  const [topEarners, setTopEarners] = useState<TopEarner[]>([]);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  const [loading, setLoading] = useState(true);
  const [generatingCodes, setGeneratingCodes] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);

  useEffect(() => {
    fetchStats();
    fetchTopEarners();
  }, [period]);

  const fetchStats = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/s2e/admin/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Error fetching admin stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTopEarners = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/s2e/admin/top-earners?period=${period}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setTopEarners(data.earners || []);
      }
    } catch (error) {
      console.error('Error fetching top earners:', error);
    }
  };

  const generateBetaCodes = async (quantity: number) => {
    setGeneratingCodes(true);
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/s2e/admin/generate-beta-codes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ quantity }),
      });

      if (response.ok) {
        const data = await response.json();
        setGeneratedCodes(data.codes.map((c: any) => c.code));
      }
    } catch (error) {
      console.error('Error generating beta codes:', error);
    } finally {
      setGeneratingCodes(false);
    }
  };

  const resetDailyLimits = async () => {
    if (!confirm('⚠️ Are you sure you want to reset daily limits for ALL users? This is an emergency action.')) {
      return;
    }

    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('token');
      const response = await fetch(`${apiBaseUrl}/api/v1/s2e/admin/reset-daily-limits`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        alert('✅ Daily limits reset successfully');
        fetchStats();
      }
    } catch (error) {
      console.error('Error resetting daily limits:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold text-white flex items-center gap-2">
          <BarChart3 size={32} className="text-yellow-400" />
          S2E Admin Panel
        </h2>
        <button
          onClick={fetchStats}
          className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </div>

      {/* Stats Grid */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <motion.div
            className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Users size={24} className="text-blue-400" />
              <span className="text-gray-400">Total Beta Users</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.total_users}</p>
            <p className="text-sm text-gray-500 mt-1">Active today: {stats.active_users_today}</p>
          </motion.div>

          <motion.div
            className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <Coins size={24} className="text-yellow-400" />
              <span className="text-gray-400">DYO Distributed</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.dyo_distributed.toFixed(2)}</p>
            <p className="text-sm text-gray-500 mt-1">All time</p>
          </motion.div>

          <motion.div
            className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <TrendingUp size={24} className="text-green-400" />
              <span className="text-gray-400">Pool Remaining</span>
            </div>
            <p className="text-3xl font-bold text-white">{stats.pool_remaining.toFixed(0)}</p>
            <p className="text-sm text-gray-500 mt-1">
              {stats.pool_remaining_percent.toFixed(1)}% of {stats.pool_total.toFixed(0)}
            </p>
            <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded-full transition-all"
                style={{ width: `${stats.pool_remaining_percent}%` }}
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* Top Earners */}
      <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-white">Top 10 Earners</h3>
          <div className="flex gap-2">
            {(['today', 'week', 'month'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  period === p
                    ? 'bg-yellow-500 text-white'
                    : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                }`}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-900/50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Rank</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">DYO Earned</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Streams</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Minutes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {topEarners.map((earner, index) => (
                <tr key={earner.user_address} className="hover:bg-gray-700/30">
                  <td className="px-4 py-3 text-white font-semibold">#{index + 1}</td>
                  <td className="px-4 py-3 text-gray-300 font-mono text-sm">
                    {earner.user_address.slice(0, 8)}...{earner.user_address.slice(-6)}
                  </td>
                  <td className="px-4 py-3 text-yellow-400 font-semibold">{earner.total_earned.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-400">{earner.streams_count}</td>
                  <td className="px-4 py-3 text-gray-400">{earner.minutes_listened.toFixed(1)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Admin Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <Key size={20} className="text-yellow-400" />
            Generate Beta Codes
          </h3>
          <div className="space-y-4">
            <div className="flex gap-2">
              {[1, 5, 10].map((qty) => (
                <button
                  key={qty}
                  onClick={() => generateBetaCodes(qty)}
                  disabled={generatingCodes}
                  className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 text-white rounded-lg transition-colors"
                >
                  Generate {qty}
                </button>
              ))}
            </div>
            {generatedCodes.length > 0 && (
              <div className="mt-4 p-4 bg-gray-700/50 rounded-lg">
                <p className="text-sm text-gray-400 mb-2">Generated Codes:</p>
                <div className="space-y-1">
                  {generatedCodes.map((code) => (
                    <code key={code} className="block text-yellow-400 font-mono text-sm">
                      {code}
                    </code>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700/50">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <AlertTriangle size={20} className="text-red-400" />
            Emergency Actions
          </h3>
          <button
            onClick={resetDailyLimits}
            className="w-full px-4 py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400 rounded-lg transition-colors"
          >
            Reset Daily Limits (All Users)
          </button>
        </div>
      </div>
    </div>
  );
};

export default S2EAdminPanel;

