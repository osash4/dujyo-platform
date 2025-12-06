import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Coins, TrendingUp, Clock, Music, BarChart3, Trophy, Calendar, UserPlus } from 'lucide-react';
import { useBlockchain } from '../../../contexts/BlockchainContext';
import { useAuth } from '../../../auth/AuthContext';
import { getApiBaseUrl } from '../../../utils/apiConfig';
import { useS2EConfig } from '../../../hooks/useS2EConfig';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface S2EStats {
  total_dyo: number;
  dyo_today: number;
  dyo_week: number;
  dyo_month: number;
  daily_used: number;
  daily_remaining: number;
  daily_limit: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon, color }) => {
  return (
    <motion.div
      className="bg-gradient-to-br from-gray-800/80 to-gray-900/80 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-xl"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.05, y: -5 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="p-3 rounded-lg" style={{ backgroundColor: `${color}20` }}>
          {icon}
        </div>
      </div>
      <p className="text-3xl font-bold text-white mb-1">{value}</p>
      <p className="text-gray-400 text-sm font-medium">{title}</p>
    </motion.div>
  );
};

const S2EStatsSection: React.FC = () => {
  const { account } = useBlockchain();
  const { user, getToken } = useAuth();
  const { config } = useS2EConfig();
  const [stats, setStats] = useState<S2EStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [ranking, setRanking] = useState<number | null>(null);
  const [earningsChartData, setEarningsChartData] = useState<number[]>([]);
  const [nextPayoutDays, setNextPayoutDays] = useState<number | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
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

        // Fetch user stats
        const statsResponse = await fetch(`${apiBaseUrl}/api/v1/s2e/user/stats/${account}`, { headers });
        if (statsResponse.ok) {
          const statsData = await statsResponse.json();
          setStats(statsData);

          // Fetch ranking (top earners)
          try {
            const rankingResponse = await fetch(
              `${apiBaseUrl}/api/v1/s2e/admin/top-earners?period=all&limit=100`,
              { headers }
            );
            if (rankingResponse.ok) {
              const topEarners = await rankingResponse.json();
              const userIndex = topEarners.findIndex((e: any) => e.user_address === account);
              if (userIndex !== -1) {
                setRanking(userIndex + 1);
              }
            }
          } catch (e) {
            console.warn('Failed to fetch ranking:', e);
          }

          // Fetch last 7 days earnings for chart
          try {
            const historyResponse = await fetch(
              `${apiBaseUrl}/api/v1/stream-earn/history`,
              { headers }
            );
            if (historyResponse.ok) {
              const history = await historyResponse.json();
              const records = history.records || [];
              
              // Group by day for last 7 days
              const last7Days = Array.from({ length: 7 }, (_, i) => {
                const date = new Date();
                date.setDate(date.getDate() - (6 - i));
                date.setHours(0, 0, 0, 0);
                return date;
              });

              const dailyEarnings = last7Days.map(day => {
                const dayStart = new Date(day);
                const dayEnd = new Date(day);
                dayEnd.setHours(23, 59, 59, 999);

                return records
                  .filter((r: any) => {
                    const recordDate = new Date(r.created_at);
                    return recordDate >= dayStart && recordDate <= dayEnd;
                  })
                  .reduce((sum: number, r: any) => sum + (r.tokens_earned || 0), 0);
              });

              setEarningsChartData(dailyEarnings);
            }
          } catch (e) {
            console.warn('Failed to fetch chart data:', e);
          }

          // Calculate next payout (end of month)
          const now = new Date();
          const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          const daysUntilPayout = Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
          setNextPayoutDays(daysUntilPayout);
        } else {
          // Fallback: calculate from history
          const historyResponse = await fetch(`${apiBaseUrl}/api/v1/stream-earn/history`, { headers });
          if (historyResponse.ok) {
            const history = await historyResponse.json();
            const records = history.records || [];
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const weekAgo = new Date(today);
            weekAgo.setDate(weekAgo.getDate() - 7);
            const monthAgo = new Date(today);
            monthAgo.setMonth(monthAgo.getMonth() - 1);

            const totalDyo = records.reduce((sum: number, r: any) => sum + (r.tokens_earned || 0), 0);
            const dyoToday = records
              .filter((r: any) => new Date(r.created_at) >= today)
              .reduce((sum: number, r: any) => sum + (r.tokens_earned || 0), 0);
            const dyoWeek = records
              .filter((r: any) => new Date(r.created_at) >= weekAgo)
              .reduce((sum: number, r: any) => sum + (r.tokens_earned || 0), 0);
            const dyoMonth = records
              .filter((r: any) => new Date(r.created_at) >= monthAgo)
              .reduce((sum: number, r: any) => sum + (r.tokens_earned || 0), 0);

            const dailyLimit = config?.dailyLimitListener || 90;
            const dailyUsed = records
              .filter((r: any) => new Date(r.created_at) >= today)
              .reduce((sum: number, r: any) => sum + (r.duration_seconds || 0) / 60, 0);

            setStats({
              total_dyo: totalDyo,
              dyo_today: dyoToday,
              dyo_week: dyoWeek,
              dyo_month: dyoMonth,
              daily_used: Math.round(dailyUsed),
              daily_remaining: Math.max(0, dailyLimit - Math.round(dailyUsed)),
              daily_limit: dailyLimit,
            });
          }
        }
      } catch (error) {
        console.error('Error fetching S2E stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [account, config]);

  if (loading) {
    return (
      <motion.div
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-yellow-400 mx-auto"></div>
          <p className="text-gray-400 mt-4">Loading S2E stats...</p>
        </div>
      </motion.div>
    );
  }

  if (!stats) {
    return null;
  }

  const avgDaily = stats.dyo_week > 0 ? (stats.dyo_week / 7).toFixed(2) : '0.00';

  return (
    <motion.div
      className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 shadow-lg"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.2 }}
    >
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-2xl font-bold text-white flex items-center gap-2">
          <Coins size={28} className="text-yellow-400" />
          Stream-to-Earn Stats
        </h3>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          title="Total DYO"
          value={stats.total_dyo.toFixed(2)}
          icon={<Coins size={24} style={{ color: '#F59E0B' }} />}
          color="#F59E0B"
        />
        <StatCard
          title="DYO Today"
          value={stats.dyo_today.toFixed(2)}
          icon={<TrendingUp size={24} style={{ color: '#10B981' }} />}
          color="#10B981"
        />
        <StatCard
          title="Daily Limit"
          value={`${stats.daily_used}/${stats.daily_limit} min`}
          icon={<Clock size={24} style={{ color: '#3B82F6' }} />}
          color="#3B82F6"
        />
        <StatCard
          title="Avg Daily"
          value={avgDaily}
          icon={<BarChart3 size={24} style={{ color: '#8B5CF6' }} />}
          color="#8B5CF6"
        />
      </div>

      {/* Additional stats */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-700/30 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">DYO This Week</p>
          <p className="text-2xl font-bold text-white">{stats.dyo_week.toFixed(2)}</p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">DYO This Month</p>
          <p className="text-2xl font-bold text-white">{stats.dyo_month.toFixed(2)}</p>
        </div>
        <div className="bg-gray-700/30 rounded-lg p-4">
          <p className="text-gray-400 text-sm mb-1">Daily Remaining</p>
          <p className="text-2xl font-bold text-white">{stats.daily_remaining} min</p>
        </div>
      </div>

      {/* 🆕 Earnings Chart (Last 7 Days) */}
      {earningsChartData.length > 0 && (
        <div className="mt-6 bg-gray-700/30 rounded-lg p-4">
          <h4 className="text-white font-semibold mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-400" />
            Earnings Last 7 Days
          </h4>
          <div className="h-48">
            <Line
              data={{
                labels: Array.from({ length: 7 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (6 - i));
                  return date.toLocaleDateString('en-US', { weekday: 'short' });
                }),
                datasets: [{
                  label: 'DYO Earned',
                  data: earningsChartData,
                  borderColor: 'rgb(251, 191, 36)',
                  backgroundColor: 'rgba(251, 191, 36, 0.1)',
                  fill: true,
                  tension: 0.4,
                }]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: {
                    display: false,
                  },
                },
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      color: '#9CA3AF',
                    },
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)',
                    },
                  },
                  x: {
                    ticks: {
                      color: '#9CA3AF',
                    },
                    grid: {
                      color: 'rgba(156, 163, 175, 0.1)',
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* 🆕 Ranking & Next Payout */}
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-4">
        {ranking !== null && (
          <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg p-4 border border-yellow-500/30">
            <div className="flex items-center gap-3">
              <Trophy size={24} className="text-yellow-400" />
              <div>
                <p className="text-gray-400 text-sm">Beta Ranking</p>
                <p className="text-2xl font-bold text-white">#{ranking} of 50</p>
              </div>
            </div>
          </div>
        )}
        
        {nextPayoutDays !== null && (
          <div className="bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-lg p-4 border border-blue-500/30">
            <div className="flex items-center gap-3">
              <Calendar size={24} className="text-blue-400" />
              <div>
                <p className="text-gray-400 text-sm">Next Pool Payout</p>
                <p className="text-2xl font-bold text-white">
                  {nextPayoutDays === 0 ? 'Today' : `${nextPayoutDays} days`}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 🆕 Invite Friend Button (Placeholder) */}
      <div className="mt-6">
        <button
          onClick={() => {
            // TODO: Implement referral program
            alert('Referral program coming soon! Share your beta code with friends.');
          }}
          className="w-full bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 border border-purple-500/30 rounded-lg p-4 transition-all flex items-center justify-center gap-2"
        >
          <UserPlus size={20} className="text-purple-400" />
          <span className="text-white font-semibold">Invite Friend (Coming Soon)</span>
        </button>
      </div>
    </motion.div>
  );
};

export default S2EStatsSection;

