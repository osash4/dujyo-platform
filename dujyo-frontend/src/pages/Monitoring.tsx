//! Monitoring Page for Dujyo
//! 
//! This page provides access to the monitoring dashboard
//! and system health information

import React from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowLeft, BarChart3, Activity, AlertTriangle, Settings } from 'lucide-react';
import MonitoringDashboard from '../components/Monitoring/Dashboard';

const Monitoring: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-900">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gray-800 border-b border-gray-700 p-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link
              to="/"
              className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Dashboard</span>
            </Link>
            
            <div className="h-6 w-px bg-gray-600" />
            
            <div className="flex items-center space-x-3">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <div>
                <h1 className="text-2xl font-bold text-white">System Monitoring</h1>
                <p className="text-gray-400">Real-time system health and performance metrics</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 text-green-500">
              <Activity className="w-5 h-5" />
              <span className="text-sm font-medium">System Healthy</span>
            </div>
            
            <button className="flex items-center space-x-2 px-4 py-2 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Quick Stats */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="p-6"
      >
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Uptime</p>
                <p className="text-2xl font-bold text-green-500">99.9%</p>
              </div>
              <Activity className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Active Users</p>
                <p className="text-2xl font-bold text-blue-500">1,247</p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Error Rate</p>
                <p className="text-2xl font-bold text-yellow-500">0.2%</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-gray-800 p-6 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-400 text-sm">Response Time</p>
                <p className="text-2xl font-bold text-purple-500">45ms</p>
              </div>
              <Activity className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </motion.div>

      {/* Monitoring Dashboard */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <MonitoringDashboard />
      </motion.div>
    </div>
  );
};

export default Monitoring;
