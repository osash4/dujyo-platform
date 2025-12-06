import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Clock, 
  Music, 
  Download, 
  Filter,
  Calendar,
  TrendingUp,
  Coins,
  ArrowLeft
} from 'lucide-react';
import { useBlockchain } from '../contexts/BlockchainContext';
import { useAuth } from '../auth/AuthContext';
import { getApiBaseUrl } from '../utils/apiConfig';
import SimpleAppLayout from '../components/Layout/SimpleAppLayout';

interface StreamRecord {
  log_id: string;
  track_id: string;
  track_title: string;
  artist_id: string;
  duration_seconds: number;
  tokens_earned: number;
  stream_type: string;
  created_at: string;
}

const S2EHistoryPage: React.FC = () => {
  const { account } = useBlockchain();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [records, setRecords] = useState<StreamRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'7d' | '30d' | 'all'>('30d');
  const [filteredRecords, setFilteredRecords] = useState<StreamRecord[]>([]);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!account) {
        setLoading(false);
        return;
      }

      try {
        const apiBaseUrl = getApiBaseUrl();
        const token = localStorage.getItem('token');
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        const response = await fetch(`${apiBaseUrl}/api/v1/stream-earn/history`, { headers });
        if (response.ok) {
          const data = await response.json();
          setRecords(data.records || []);
        }
      } catch (error) {
        console.error('Error fetching history:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [account]);

  useEffect(() => {
    const now = new Date();
    let cutoffDate: Date;

    switch (filter) {
      case '7d':
        cutoffDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        cutoffDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        cutoffDate = new Date(0);
    }

    const filtered = records.filter(record => {
      const recordDate = new Date(record.created_at);
      return recordDate >= cutoffDate;
    });

    setFilteredRecords(filtered);
  }, [records, filter]);

  const exportToCSV = () => {
    const headers = ['Date', 'Track', 'Artist', 'Duration (min)', 'Tokens Earned', 'Type'];
    const rows = filteredRecords.map(record => [
      new Date(record.created_at).toLocaleString(),
      record.track_title,
      record.artist_id,
      (record.duration_seconds / 60).toFixed(2),
      record.tokens_earned.toFixed(2),
      record.stream_type,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `s2e-history-${filter}-${Date.now()}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const totalEarned = filteredRecords.reduce((sum, r) => sum + r.tokens_earned, 0);
  const totalMinutes = filteredRecords.reduce((sum, r) => sum + r.duration_seconds / 60, 0);
  const avgPerMinute = totalMinutes > 0 ? totalEarned / totalMinutes : 0;

  return (
    <SimpleAppLayout>
      <div className="min-h-screen text-white p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <button
                onClick={() => navigate(-1)}
                className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
              >
                <ArrowLeft size={24} />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-white flex items-center gap-2">
                  <Music size={32} className="text-yellow-400" />
                  Stream-to-Earn History
                </h1>
                <p className="text-gray-400 mt-1">Complete history of your streaming activity</p>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <motion.div
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Coins size={20} className="text-yellow-400" />
                <span className="text-gray-400 text-sm">Total Earned</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalEarned.toFixed(2)} DYO</p>
            </motion.div>

            <motion.div
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Clock size={20} className="text-blue-400" />
                <span className="text-gray-400 text-sm">Total Time</span>
              </div>
              <p className="text-2xl font-bold text-white">{totalMinutes.toFixed(1)} min</p>
            </motion.div>

            <motion.div
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp size={20} className="text-green-400" />
                <span className="text-gray-400 text-sm">Avg Rate</span>
              </div>
              <p className="text-2xl font-bold text-white">{avgPerMinute.toFixed(3)} DYO/min</p>
            </motion.div>

            <motion.div
              className="bg-gray-800/50 rounded-xl p-4 border border-gray-700/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-3 mb-2">
                <Music size={20} className="text-purple-400" />
                <span className="text-gray-400 text-sm">Total Streams</span>
              </div>
              <p className="text-2xl font-bold text-white">{filteredRecords.length}</p>
            </motion.div>
          </div>

          {/* Filters and Export */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter size={20} className="text-gray-400" />
              <span className="text-gray-400">Filter:</span>
              {(['7d', '30d', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    filter === f
                      ? 'bg-yellow-500 text-white'
                      : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
                  }`}
                >
                  {f === '7d' ? 'Last 7 days' : f === '30d' ? 'Last 30 days' : 'All time'}
                </button>
              ))}
            </div>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              <Download size={16} />
              Export CSV
            </button>
          </div>

          {/* History Table */}
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
              <p className="text-gray-400 mt-4">Loading history...</p>
            </div>
          ) : filteredRecords.length === 0 ? (
            <div className="text-center py-12 bg-gray-800/50 rounded-xl border border-gray-700/50">
              <Music size={48} className="text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400 text-lg">No streaming history found</p>
              <p className="text-gray-500 text-sm mt-2">Start streaming to see your history here</p>
            </div>
          ) : (
            <div className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-900/50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Track</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Duration</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Tokens</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-700">
                    {filteredRecords.map((record, index) => (
                      <motion.tr
                        key={record.log_id}
                        className="hover:bg-gray-700/30 transition-colors"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.02 }}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {new Date(record.created_at).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <p className="text-sm font-medium text-white">{record.track_title}</p>
                            <p className="text-xs text-gray-400">{record.artist_id}</p>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                          {(record.duration_seconds / 60).toFixed(2)} min
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-yellow-400">
                          +{record.tokens_earned.toFixed(2)} DYO
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            record.stream_type === 'artist'
                              ? 'bg-orange-500/20 text-orange-400'
                              : 'bg-blue-500/20 text-blue-400'
                          }`}>
                            {record.stream_type}
                          </span>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </SimpleAppLayout>
  );
};

export default S2EHistoryPage;

