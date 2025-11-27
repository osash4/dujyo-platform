import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Users, 
  Palette, 
  Heart, 
  Activity, 
  Shield,
  Zap,
  BarChart3
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';

interface ConsensusStats {
  economic_validators: number;
  creative_validators: number;
  community_validators: number;
  total_validation_rounds: number;
  economic_validations: number;
  creative_validations: number;
  community_validations: number;
}

const StatCard: React.FC<{
  icon: React.ElementType;
  title: string;
  value: string;
  subtitle?: string;
  color: string;
  trend?: string;
}> = ({ icon: Icon, title, value, subtitle, color, trend }) => (
  <motion.div
    className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50 shadow-lg hover:shadow-2xl transition-all duration-300"
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.5 }}
    whileHover={{ 
      scale: 1.02,
      boxShadow: `0 0 30px ${color}30`
    }}
  >
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-3">
        <motion.div
          className="p-3 rounded-lg"
          style={{ backgroundColor: `${color}20` }}
          whileHover={{ rotate: 360 }}
          transition={{ duration: 0.5 }}
        >
          <Icon size={24} style={{ color }} />
        </motion.div>
        <div>
          <h3 className="text-lg font-semibold text-gray-200">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-400">{subtitle}</p>
          )}
        </div>
      </div>
      {trend && (
        <motion.div
          className="flex items-center gap-1 text-sm font-medium text-green-400"
          animate={{ 
            scale: [1, 1.05, 1],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            repeatType: "reverse"
          }}
        >
          <TrendingUp size={16} />
          <span>{trend}</span>
        </motion.div>
      )}
    </div>
    <motion.p 
      className="text-3xl font-bold text-white"
      initial={{ scale: 0.8 }}
      animate={{ scale: 1 }}
      transition={{ duration: 0.3, delay: 0.2 }}
    >
      {value}
    </motion.p>
  </motion.div>
);

const CPVDashboard: React.FC = () => {
  const [stats, setStats] = useState<ConsensusStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  useEffect(() => {
    const loadConsensusStats = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const token = localStorage.getItem('jwt_token');
        if (!token) {
          throw new Error('No authentication token found');
        }

        const response = await fetch('http://localhost:8083/consensus/stats', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch consensus stats: ${response.status}`);
        }

        const data = await response.json();
        setStats(data);
      } catch (err) {
        console.error('Error loading consensus stats:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    };

    loadConsensusStats();
    
    // Refresh stats every 30 seconds
    const interval = setInterval(loadConsensusStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <motion.div
          className="flex items-center gap-3"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
        >
          <Activity className="w-6 h-6 text-amber-400" />
          <span className="text-gray-300">Loading CPV Consensus Stats...</span>
        </motion.div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/20 border border-red-500/50 rounded-xl p-6 text-center">
        <Shield className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-red-400 mb-2">Error Loading Stats</h3>
        <p className="text-gray-300">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const totalValidators = stats.economic_validators + stats.creative_validators + stats.community_validators;
  const totalValidations = stats.economic_validations + stats.creative_validations + stats.community_validations;

  return (
    <div className="space-y-8">
      {/* Header */}
      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <h2 className="text-4xl font-bold text-white mb-4">
          <span className="bg-gradient-to-r from-amber-400 via-blue-500 to-orange-600 bg-clip-text text-transparent">
            Creative Proof of Value (CPV)
          </span>
        </h2>
        <p className="text-gray-300 text-lg max-w-3xl mx-auto">
          DUJYO's unique hybrid consensus combining economic security, creative validation, and community governance
        </p>
      </motion.div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          icon={Users}
          title="Total Validators"
          value={totalValidators.toString()}
          subtitle="Active validators"
          color="#00F5FF"
          trend="+5.2%"
        />
        <StatCard
          icon={Activity}
          title="Validation Rounds"
          value={stats.total_validation_rounds.toString()}
          subtitle="Blocks validated"
          color="#EA580C"
          trend="+12.5%"
        />
        <StatCard
          icon={BarChart3}
          title="Total Validations"
          value={totalValidations.toString()}
          subtitle="All time"
          color="#F59E0B"
          trend="+7.1%"
        />
        <StatCard
          icon={Zap}
          title="Network Health"
          value="98.5%"
          subtitle="Uptime"
          color="#FFD700"
          trend="+0.3%"
        />
      </div>

      {/* Validator Type Breakdown */}
      <motion.div
        className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Shield className="w-6 h-6 text-amber-400" />
          Validator Distribution
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Economic Validators */}
          <motion.div
            className="bg-gradient-to-br from-orange-500/20 to-orange-500/20 rounded-xl p-6 border border-blue-500/30"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-blue-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Economic</h4>
                <p className="text-sm text-gray-400">Stake + Activity</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Validators:</span>
                <span className="text-white font-semibold">{stats.economic_validators}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Validations:</span>
                <span className="text-white font-semibold">{stats.economic_validations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Weight:</span>
                <span className="text-blue-400 font-semibold">40%</span>
              </div>
            </div>
          </motion.div>

          {/* Creative Validators */}
          <motion.div
            className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-xl p-6 border border-purple-500/30"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Palette className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Creative</h4>
                <p className="text-sm text-gray-400">NFTs + Royalties</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Validators:</span>
                <span className="text-white font-semibold">{stats.creative_validators}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Validations:</span>
                <span className="text-white font-semibold">{stats.creative_validations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Weight:</span>
                <span className="text-purple-400 font-semibold">35%</span>
              </div>
            </div>
          </motion.div>

          {/* Community Validators */}
          <motion.div
            className="bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl p-6 border border-green-500/30"
            whileHover={{ scale: 1.02 }}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-500/20 rounded-lg">
                <Heart className="w-6 h-6 text-green-400" />
              </div>
              <div>
                <h4 className="text-lg font-semibold text-white">Community</h4>
                <p className="text-sm text-gray-400">Votes + Reports</p>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-300">Validators:</span>
                <span className="text-white font-semibold">{stats.community_validators}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Validations:</span>
                <span className="text-white font-semibold">{stats.community_validations}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-300">Weight:</span>
                <span className="text-green-400 font-semibold">25%</span>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>

      {/* CPV Explanation */}
      <motion.div
        className="bg-gradient-to-r from-gray-800/50 to-gray-700/50 backdrop-blur-sm rounded-xl p-8 border border-gray-600/50 shadow-lg"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
      >
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
          <Zap className="w-6 h-6 text-yellow-400" />
          How CPV Works
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <h4 className="text-lg font-semibold text-amber-400 mb-3">Double Validation Filter</h4>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-blue-400 mt-1">•</span>
                <span><strong>Economic:</strong> Prevents financial fraud in transactions and token operations</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-purple-400 mt-1">•</span>
                <span><strong>Creative:</strong> Ensures content authenticity and royalty distribution</span>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="text-lg font-semibold text-green-400 mb-3">Proof of Flow Integration</h4>
            <ul className="space-y-2 text-gray-300">
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Measures real network usage (streams, games, NFTs)</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-400 mt-1">•</span>
                <span>Rewards active participation and content creation</span>
              </li>
            </ul>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default CPVDashboard;
