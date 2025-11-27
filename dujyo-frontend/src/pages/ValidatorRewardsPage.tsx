import React from 'react';
import { motion } from 'framer-motion';
import { Award, TrendingUp, Calendar, Zap } from 'lucide-react';

const ValidatorRewardsPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 p-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="text-4xl font-bold text-white mb-4">Validator Rewards</h1>
          <p className="text-gray-300">Track your validation earnings and rewards</p>
        </motion.div>

        <motion.div
          className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <h2 className="text-2xl font-semibold text-white mb-6">Coming Soon</h2>
          <p className="text-gray-300">Detailed rewards tracking and analytics will be available here.</p>
        </motion.div>
      </div>
    </div>
  );
};

export default ValidatorRewardsPage;
