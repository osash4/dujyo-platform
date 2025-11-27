import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { BarChart3, UserPlus } from 'lucide-react';
import SimpleAppLayout from '../components/Layout/SimpleAppLayout';
import CPVDashboard from '../components/consensus/CPVDashboard';
import ValidatorRegistration from '../components/consensus/ValidatorRegistration';
import { usePlayerContext } from '../contexts/PlayerContext';

const ConsensusPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'register'>('overview');
  const { setPlayerPosition } = usePlayerContext();

  // Set player position to top when component mounts
  useEffect(() => {
    setPlayerPosition('top');
  }, [setPlayerPosition]);

  const tabs = [
    { id: 'overview', label: 'CPV Overview', icon: BarChart3, color: '#00F5FF' },
    { id: 'register', label: 'Become Validator', icon: UserPlus, color: '#F59E0B' },
  ];

  return (
    <SimpleAppLayout>
      <div className="min-h-screen text-white" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Header */}
        <div className="bg-gray-800/50 backdrop-blur-sm border-b border-gray-700/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex justify-center space-x-2 py-4">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                
                return (
                  <motion.button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`relative flex items-center gap-2 py-3 px-6 rounded-xl font-medium text-sm transition-all duration-300 ${
                      isActive
                        ? 'text-white'
                        : 'text-gray-400 hover:text-gray-300'
                    }`}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                  >
                    {isActive && (
                      <motion.div
                        className="absolute inset-0 rounded-xl"
                        style={{
                          background: `linear-gradient(135deg, ${tab.color}20, transparent)`,
                          border: `1px solid ${tab.color}30`,
                          boxShadow: `0 0 10px ${tab.color}20`
                        }}
                        layoutId="activeConsensusTab"
                        transition={{ duration: 0.3 }}
                      />
                    )}
                    <Icon 
                      size={20} 
                      style={{ color: isActive ? tab.color : undefined }}
                      className="relative z-10"
                    />
                    <span className="relative z-10">{tab.label}</span>
                  </motion.button>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            {activeTab === 'overview' && <CPVDashboard />}
            {activeTab === 'register' && <ValidatorRegistration />}
          </motion.div>
        </div>
      </div>
    </SimpleAppLayout>
  );
};

export default ConsensusPage;
