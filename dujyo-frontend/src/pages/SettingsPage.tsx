import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Settings, 
  User, 
  Bell, 
  Shield, 
  Palette, 
  Volume2, 
  Globe,
  Download,
  Trash2,
  Save
} from 'lucide-react';

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState('profile');

  const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'data', label: 'Data', icon: Download },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-4">
            <div className="p-3 bg-purple-500/20 rounded-xl">
              <Settings size={32} className="text-purple-400" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">Settings</h1>
              <p className="text-gray-300">Manage your account and preferences</p>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Settings Navigation */}
          <motion.div
            className="lg:col-span-1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-4 border border-gray-700/50">
              <h3 className="text-lg font-semibold text-white mb-4">Settings</h3>
              <div className="space-y-2">
                {settingsTabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all ${
                      activeTab === tab.id
                        ? 'bg-purple-500 text-white'
                        : 'text-gray-300 hover:bg-gray-700/50'
                    }`}
                  >
                    <tab.icon size={18} />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Settings Content */}
          <motion.div
            className="lg:col-span-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700/50">
              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">Profile Settings</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter your display name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Bio
                      </label>
                      <textarea
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={4}
                        placeholder="Tell us about yourself"
                      />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors">
                      <Save size={18} />
                      Save Changes
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">Notification Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Push Notifications</h4>
                        <p className="text-gray-400 text-sm">Receive notifications on your device</p>
                      </div>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Email Notifications</h4>
                        <p className="text-gray-400 text-sm">Receive updates via email</p>
                      </div>
                      <input type="checkbox" className="toggle" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">New Music Alerts</h4>
                        <p className="text-gray-400 text-sm">Get notified about new releases</p>
                      </div>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">Privacy Settings</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Public Profile</h4>
                        <p className="text-gray-400 text-sm">Make your profile visible to others</p>
                      </div>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Show Listening Activity</h4>
                        <p className="text-gray-400 text-sm">Let others see what you're listening to</p>
                      </div>
                      <input type="checkbox" className="toggle" />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Data Collection</h4>
                        <p className="text-gray-400 text-sm">Allow data collection for improvements</p>
                      </div>
                      <input type="checkbox" className="toggle" defaultChecked />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">Appearance Settings</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Theme
                      </label>
                      <select className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="auto">Auto</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Accent Color
                      </label>
                      <div className="flex gap-2">
                        {['#F59E0B', '#EA580C', '#00F5FF', '#FBBF24', '#7C2D12'].map((color) => (
                          <button
                            key={color}
                            className="w-8 h-8 rounded-full border-2 border-gray-600"
                            style={{ backgroundColor: color }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audio' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">Audio Settings</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Volume
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        defaultValue="75"
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Audio Quality
                      </label>
                      <select className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="low">Low (128 kbps)</option>
                        <option value="medium">Medium (256 kbps)</option>
                        <option value="high">High (320 kbps)</option>
                        <option value="lossless">Lossless</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'language' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">Language Settings</h3>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Language
                      </label>
                      <select className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="en">English</option>
                        <option value="es">Español</option>
                        <option value="fr">Français</option>
                        <option value="de">Deutsch</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Region
                      </label>
                      <select className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500">
                        <option value="us">United States</option>
                        <option value="mx">Mexico</option>
                        <option value="ca">Canada</option>
                        <option value="uk">United Kingdom</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'data' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">Data Management</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                      <div>
                        <h4 className="text-white font-medium">Download Your Data</h4>
                        <p className="text-gray-400 text-sm">Get a copy of your data</p>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                        <Download size={18} />
                        Download
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                      <div>
                        <h4 className="text-white font-medium">Delete Account</h4>
                        <p className="text-gray-400 text-sm">Permanently delete your account</p>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                        <Trash2 size={18} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
