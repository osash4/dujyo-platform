import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  BarChart3, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock,
  Award,
  Activity,
  Zap
} from 'lucide-react';

const ValidatorPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('overview');

  const validationStats = {
    totalValidations: 1247,
    successfulValidations: 1189,
    failedValidations: 58,
    accuracy: 95.3,
    rewardsEarned: 2450,
    reputation: 98.7
  };

  const recentValidations = [
    { id: 1, content: 'Music Track - "Summer Vibes"', type: 'music', status: 'approved', timestamp: '2 min ago' },
    { id: 2, content: 'Video - "Gaming Tutorial"', type: 'video', status: 'rejected', timestamp: '5 min ago' },
    { id: 3, content: 'Game Asset - "Character Model"', type: 'gaming', status: 'approved', timestamp: '8 min ago' },
    { id: 4, content: 'Music Track - "Night Drive"', type: 'music', status: 'pending', timestamp: '12 min ago' },
  ];

  const networkStats = {
    totalValidators: 156,
    activeValidators: 142,
    networkHealth: 98.2,
    consensusRate: 99.1,
    averageValidationTime: '3.2s'
  };

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: 'var(--bg-primary)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-blue-500/20 rounded-xl">
              <Shield size={32} className="icon-blockchain" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Validator Hub</h1>
              <p className="text-gray-300">CPV Consensus & Validation Panel</p>
            </div>
          </div>
        </motion.div>

        {/* Navigation Tabs */}
        <motion.div
          className="flex gap-2 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'validations', label: 'Validations', icon: CheckCircle },
            { id: 'rewards', label: 'Rewards', icon: Award },
            { id: 'network', label: 'Network', icon: Activity }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${
                activeTab === tab.id
                  ? 'tab-active-tech'
                  : 'tab-inactive'
              }`}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </motion.div>

        {/* Content */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Validation Stats */}
            <motion.div
              className="card p-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <CheckCircle className="text-green-400" />
                Validation Stats
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Validations</span>
                  <span className="text-white font-semibold">{validationStats.totalValidations}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Success Rate</span>
                  <span className="text-green-400 font-semibold">{validationStats.accuracy}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Reputation</span>
                  <span className="text-blue-400 font-semibold">{validationStats.reputation}%</span>
                </div>
              </div>
            </motion.div>

            {/* Rewards */}
            <motion.div
              className="card p-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Award className="text-yellow-400" />
                Rewards
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Earned</span>
                  <span className="text-yellow-400 font-semibold">{validationStats.rewardsEarned} DYO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">This Week</span>
                  <span className="text-green-400 font-semibold">+245 DYO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Ranking</span>
                  <span className="text-purple-400 font-semibold">#12</span>
                </div>
              </div>
            </motion.div>

            {/* Network Health */}
            <motion.div
              className="card p-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h3 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Activity className="text-green-400" />
                Network Health
              </h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-300">Health Score</span>
                  <span className="text-green-400 font-semibold">{networkStats.networkHealth}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Consensus Rate</span>
                  <span className="text-blue-400 font-semibold">{networkStats.consensusRate}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Active Validators</span>
                  <span className="text-white font-semibold">{networkStats.activeValidators}</span>
                </div>
              </div>
            </motion.div>
          </div>
        )}

        {activeTab === 'validations' && (
          <motion.div
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl font-semibold text-white mb-6">Recent Validations</h3>
            <div className="space-y-4">
              {recentValidations.map((validation) => (
                <div
                  key={validation.id}
                  className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg"
                >
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg ${
                      validation.status === 'approved' ? 'bg-green-500/20' :
                      validation.status === 'rejected' ? 'bg-red-500/20' :
                      'bg-yellow-500/20'
                    }`}>
                      {validation.status === 'approved' ? (
                        <CheckCircle className="text-green-400" size={20} />
                      ) : validation.status === 'rejected' ? (
                        <XCircle className="text-red-400" size={20} />
                      ) : (
                        <Clock className="text-yellow-400" size={20} />
                      )}
                    </div>
                    <div>
                      <p className="text-white font-medium">{validation.content}</p>
                      <p className="text-gray-400 text-sm capitalize">{validation.type} • {validation.timestamp}</p>
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    validation.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                    validation.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                    'bg-yellow-500/20 text-yellow-400'
                  }`}>
                    {validation.status}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {activeTab === 'rewards' && (
          <motion.div
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl font-semibold text-white mb-6">Rewards & Earnings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-yellow-500/20 to-orange-500/20 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-2">Total Earnings</h4>
                  <p className="text-3xl font-bold text-yellow-400">{validationStats.rewardsEarned} DYO</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-orange-500/20 to-purple-500/20 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-2">This Month</h4>
                  <p className="text-2xl font-bold text-blue-400">+1,245 DYO</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-2">Validation Bonus</h4>
                  <p className="text-2xl font-bold text-green-400">+150 DYO</p>
                </div>
                <div className="p-4 bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-lg">
                  <h4 className="text-lg font-semibold text-white mb-2">Consensus Reward</h4>
                  <p className="text-2xl font-bold text-purple-400">+75 DYO</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'network' && (
          <motion.div
            className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <h3 className="text-2xl font-semibold text-white mb-6">Network Statistics</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="p-4 bg-gray-700/30 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-2">Total Validators</h4>
                <p className="text-2xl font-bold text-blue-400">{networkStats.totalValidators}</p>
              </div>
              <div className="p-4 bg-gray-700/30 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-2">Active Validators</h4>
                <p className="text-2xl font-bold text-green-400">{networkStats.activeValidators}</p>
              </div>
              <div className="p-4 bg-gray-700/30 rounded-lg">
                <h4 className="text-lg font-semibold text-white mb-2">Avg. Validation Time</h4>
                <p className="text-2xl font-bold text-yellow-400">{networkStats.averageValidationTime}</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default ValidatorPage;
