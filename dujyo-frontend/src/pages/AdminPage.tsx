import React, { useState } from 'react';
import { motion } from 'framer-motion';
import SimpleAppLayout from '../components/Layout/SimpleAppLayout';
import { Settings, Coins, Users, BarChart3, Shield, Zap } from 'lucide-react';

const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'token' | 'consensus' | 'users'>('overview');

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'token', label: 'Token Management', icon: Coins },
    { id: 'consensus', label: 'Consensus', icon: Shield },
    { id: 'users', label: 'User Management', icon: Users },
  ];

  return (
    <SimpleAppLayout>
      <div className="min-h-screen bg-gray-900 text-white p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center gap-3 mb-8">
              <Settings size={32} className="text-purple-400" />
              <h1 className="text-4xl font-bold">Admin Dashboard</h1>
            </div>

            {/* Navigation Tabs */}
            <div className="flex space-x-4 mb-8">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;

                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                      isActive
                        ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/25'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    <Icon size={20} />
                    {tab.label}
                  </button>
                );
              })}
            </div>

            {/* Tab Content */}
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'overview' && <AdminOverview />}
              {activeTab === 'token' && <TokenManagement />}
              {activeTab === 'consensus' && <ConsensusManagement />}
              {activeTab === 'users' && <UserManagement />}
            </motion.div>
          </div>
        </motion.div>
      </div>
    </SimpleAppLayout>
  );
};

// Admin Overview Component
const AdminOverview: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <BarChart3 size={24} className="text-blue-400" />
            </div>
            <span className="text-sm text-gray-400">24h</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">1,247</h3>
          <p className="text-gray-400">Total Transactions</p>
        </motion.div>

        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-green-500/20 rounded-lg">
              <Users size={24} className="text-green-400" />
            </div>
            <span className="text-sm text-gray-400">Active</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">89</h3>
          <p className="text-gray-400">Active Users</p>
        </motion.div>

        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <Shield size={24} className="text-purple-400" />
            </div>
            <span className="text-sm text-gray-400">Online</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">12</h3>
          <p className="text-gray-400">Active Validators</p>
        </motion.div>

        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
          whileHover={{ scale: 1.02 }}
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-yellow-500/20 rounded-lg">
              <Zap size={24} className="text-yellow-400" />
            </div>
            <span className="text-sm text-gray-400">Blocks</span>
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">156</h3>
          <p className="text-gray-400">Blocks Produced</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { action: 'Token Minted', amount: '10,000 DYO', time: '2 minutes ago' },
              { action: 'Validator Registered', validator: 'Validator_001', time: '5 minutes ago' },
              { action: 'Vesting Released', amount: '5,000 DYO', time: '10 minutes ago' },
              { action: 'DEX Swap', amount: '1,000 DYO', time: '15 minutes ago' },
            ].map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700/30 rounded-lg">
                <div>
                  <p className="text-white font-medium">{activity.action}</p>
                  <p className="text-gray-400 text-sm">
                    {activity.amount && `Amount: ${activity.amount}`}
                    {activity.validator && `Validator: ${activity.validator}`}
                  </p>
                </div>
                <span className="text-gray-500 text-sm">{activity.time}</span>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-xl font-semibold text-white mb-4">System Health</h3>
          <div className="space-y-4">
            {[
              { service: 'Blockchain Node', status: 'healthy', uptime: '99.9%' },
              { service: 'Database', status: 'healthy', uptime: '99.8%' },
              { service: 'API Server', status: 'healthy', uptime: '99.9%' },
              { service: 'Consensus Engine', status: 'healthy', uptime: '99.7%' },
            ].map((service, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-gray-300">{service.service}</span>
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${
                    service.status === 'healthy' ? 'bg-green-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-gray-400 text-sm">{service.uptime}</span>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

// Token Management Component
const TokenManagement: React.FC = () => {
  const [mintAmount, setMintAmount] = useState('');

  return (
    <div className="space-y-8">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-xl font-semibold text-white mb-6">Token Minting</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Amount to Mint (DYO)
            </label>
            <input
              type="number"
              value={mintAmount}
              onChange={(e) => setMintAmount(e.target.value)}
              placeholder="Enter amount to mint"
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <button className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-colors">
              Mint Tokens
            </button>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-gray-700/50 rounded-lg">
              <h4 className="text-white font-medium mb-2">Token Statistics</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Supply:</span>
                  <span className="text-white">1,000,000,000 DYO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Circulating Supply:</span>
                  <span className="text-white">300,000,000 DYO</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Market Cap:</span>
                  <span className="text-white">$300,000 USD</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Consensus Management Component
const ConsensusManagement: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-xl font-semibold text-white mb-6">Consensus Dashboard</h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
              <h4 className="text-blue-400 font-medium">Economic Validators</h4>
            </div>
            <p className="text-2xl font-bold text-white">8</p>
            <p className="text-blue-300 text-sm">Active validators</p>
          </div>

          <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
              <h4 className="text-green-400 font-medium">Creative Validators</h4>
            </div>
            <p className="text-2xl font-bold text-white">5</p>
            <p className="text-green-300 text-sm">Active validators</p>
          </div>

          <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
              <h4 className="text-purple-400 font-medium">Community Validators</h4>
            </div>
            <p className="text-2xl font-bold text-white">4</p>
            <p className="text-purple-300 text-sm">Active validators</p>
          </div>
        </div>
      </div>
    </div>
  );
};

// User Management Component
const UserManagement: React.FC = () => {
  return (
    <div className="space-y-8">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
        <h3 className="text-xl font-semibold text-white mb-6">User Management</h3>

        <div className="text-center py-12">
          <Users size={48} className="text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">User management features coming soon...</p>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
