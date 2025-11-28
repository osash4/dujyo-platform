import React, { useState, useEffect } from 'react';
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
  Save,
  Upload,
  Image as ImageIcon,
  CheckCircle,
  X,
  Moon,
  Sun,
  Monitor
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useTranslation } from '../utils/i18n';
import { getApiBaseUrl } from '../utils/apiConfig';

interface NotificationPreferences {
  pushNotifications: boolean;
  emailNotifications: boolean;
  newMusicAlerts: boolean;
}

interface PrivacySettings {
  publicProfile: boolean;
  showListeningActivity: boolean;
  dataCollection: boolean;
}

const SettingsPage: React.FC = () => {
  const { user } = useAuth();
  const { language, setLanguage } = useTranslation();
  const [activeTab, setActiveTab] = useState('profile');
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'success' | 'error'>('idle');
  
  // Profile state
  const [displayName, setDisplayName] = useState(user?.displayName || '');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(user?.photoURL || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  // Appearance state
  const [theme, setTheme] = useState<'dark' | 'light' | 'auto'>(() => {
    const saved = localStorage.getItem('dujyo_theme');
    return (saved as 'dark' | 'light' | 'auto') || 'dark';
  });
  const [accentColor, setAccentColor] = useState('#F59E0B');
  
  // Notifications state
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    pushNotifications: true,
    emailNotifications: false,
    newMusicAlerts: true,
  });
  
  // Privacy state
  const [privacy, setPrivacy] = useState<PrivacySettings>({
    publicProfile: true,
    showListeningActivity: false,
    dataCollection: true,
  });
  
  // Audio state
  const [volume, setVolume] = useState(75);
  const [audioQuality, setAudioQuality] = useState('high');

  // Load user data on mount
  useEffect(() => {
    loadUserProfile();
    loadNotificationPreferences();
    loadPrivacySettings();
  }, [user]);

  const loadUserProfile = async () => {
    if (!user) return;
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('jwt_token');
      
      const response = await fetch(`${apiBaseUrl}/api/v1/user/profile`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setDisplayName(data.display_name || user.displayName || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || user.photoURL || '');
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    }
  };

  const loadNotificationPreferences = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('jwt_token');
      
      const response = await fetch(`${apiBaseUrl}/api/v1/notifications/preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        // Map backend preferences to frontend state
        setNotifications({
          pushNotifications: data.push_enabled !== false,
          emailNotifications: data.email_enabled === true,
          newMusicAlerts: data.new_music_alerts !== false,
        });
      }
    } catch (error) {
      console.error('Error loading notification preferences:', error);
    }
  };

  const loadPrivacySettings = async () => {
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('jwt_token');
      
      const response = await fetch(`${apiBaseUrl}/api/v1/user/privacy`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      if (response.ok) {
        const data = await response.json();
        setPrivacy({
          publicProfile: data.public_profile !== false,
          showListeningActivity: data.show_listening_activity === true,
          dataCollection: data.data_collection !== false,
        });
      }
    } catch (error) {
      console.error('Error loading privacy settings:', error);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('Image size must be less than 5MB');
        return;
      }
      
      setAvatarFile(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadAvatar = async (): Promise<string | null> => {
    if (!avatarFile) return avatarUrl;
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('jwt_token');
      
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      const response = await fetch(`${apiBaseUrl}/api/v1/user/avatar`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });
      
      if (response.ok) {
        const data = await response.json();
        return data.avatar_url || null;
      } else {
        throw new Error('Failed to upload avatar');
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      throw error;
    }
  };

  const saveProfile = async () => {
    setLoading(true);
    setSaveStatus('saving');
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('jwt_token');
      
      // Upload avatar first if changed
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        finalAvatarUrl = await uploadAvatar() || avatarUrl;
        setAvatarUrl(finalAvatarUrl);
        setAvatarFile(null);
        setAvatarPreview(null);
      }
      
      // Update profile
      const response = await fetch(`${apiBaseUrl}/api/v1/user/profile`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio,
          avatar_url: finalAvatarUrl,
        }),
      });
      
      if (response.ok) {
        // Update local user state
        const updatedUser = { ...user, displayName, photoURL: finalAvatarUrl };
        localStorage.setItem('user', JSON.stringify(updatedUser));
        
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Failed to save profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const saveNotifications = async () => {
    setLoading(true);
    setSaveStatus('saving');
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('jwt_token');
      
      // Save each notification preference
      const preferences = [
        { notification_type: 'push', enabled: notifications.pushNotifications, email_enabled: false, push_enabled: notifications.pushNotifications },
        { notification_type: 'email', enabled: notifications.emailNotifications, email_enabled: notifications.emailNotifications, push_enabled: false },
        { notification_type: 'new_music', enabled: notifications.newMusicAlerts, email_enabled: notifications.emailNotifications, push_enabled: notifications.pushNotifications },
      ];
      
      await Promise.all(
        preferences.map(pref =>
          fetch(`${apiBaseUrl}/api/v1/notifications/preferences`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(pref),
          })
        )
      );
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (error) {
      console.error('Error saving notifications:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const savePrivacy = async () => {
    setLoading(true);
    setSaveStatus('saving');
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = localStorage.getItem('jwt_token');
      
      const response = await fetch(`${apiBaseUrl}/api/v1/user/privacy`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(privacy),
      });
      
      if (response.ok) {
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        throw new Error('Failed to save privacy settings');
      }
    } catch (error) {
      console.error('Error saving privacy:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleLanguageChange = (newLanguage: 'en' | 'es') => {
    setLanguage(newLanguage);
    // Language is automatically saved to localStorage by setLanguage
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'auto') => {
    setTheme(newTheme);
    localStorage.setItem('dujyo_theme', newTheme);
    applyTheme(newTheme);
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const applyTheme = (themeMode: 'dark' | 'light' | 'auto') => {
    const root = document.documentElement;
    
    if (themeMode === 'auto') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', prefersDark);
      root.classList.toggle('light', !prefersDark);
    } else {
      root.classList.remove('dark', 'light');
      root.classList.add(themeMode);
    }
  };

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const settingsTabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Privacy', icon: Shield },
    { id: 'appearance', label: 'Appearance', icon: Palette },
    { id: 'audio', label: 'Audio', icon: Volume2 },
    { id: 'language', label: 'Language', icon: Globe },
    { id: 'data', label: 'Data', icon: Download },
  ];

  const accentColors = ['#F59E0B', '#EA580C', '#00F5FF', '#FBBF24', '#7C2D12', '#8B5CF6'];

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
              {/* Save Status Indicator */}
              {saveStatus !== 'idle' && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                    saveStatus === 'success' ? 'bg-green-500/20 text-green-400' :
                    saveStatus === 'error' ? 'bg-red-500/20 text-red-400' :
                    'bg-blue-500/20 text-blue-400'
                  }`}
                >
                  {saveStatus === 'success' && <CheckCircle size={18} />}
                  {saveStatus === 'error' && <X size={18} />}
                  {saveStatus === 'saving' && <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-400 border-t-transparent" />}
                  <span>
                    {saveStatus === 'success' && 'Settings saved successfully!'}
                    {saveStatus === 'error' && 'Failed to save settings. Please try again.'}
                    {saveStatus === 'saving' && 'Saving...'}
                  </span>
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">Profile Settings</h3>
                  <div className="space-y-6">
                    {/* Avatar Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Profile Picture
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <img
                            src={avatarPreview || avatarUrl || `https://ui-avatars.com/api/?name=${displayName || user?.email}&background=F59E0B&color=fff&size=128`}
                            alt="Avatar"
                            className="w-24 h-24 rounded-full object-cover border-2 border-purple-500"
                          />
                          {avatarPreview && (
                            <button
                              onClick={() => {
                                setAvatarPreview(null);
                                setAvatarFile(null);
                              }}
                              className="absolute -top-2 -right-2 p-1 bg-red-500 rounded-full text-white"
                            >
                              <X size={16} />
                            </button>
                          )}
                        </div>
                        <div>
                          <label className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg cursor-pointer transition-colors">
                            <Upload size={18} />
                            Upload Photo
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleAvatarChange}
                              className="hidden"
                            />
                          </label>
                          <p className="text-xs text-gray-400 mt-1">Max 5MB, JPG/PNG</p>
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Display Name
                      </label>
                      <input
                        type="text"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Enter your display name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Bio
                      </label>
                      <textarea
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                        rows={4}
                        placeholder="Tell us about yourself"
                      />
                    </div>
                    <button
                      onClick={saveProfile}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50"
                    >
                      <Save size={18} />
                      {loading ? 'Saving...' : 'Save Changes'}
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
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.pushNotifications}
                          onChange={(e) => setNotifications({ ...notifications, pushNotifications: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Email Notifications</h4>
                        <p className="text-gray-400 text-sm">Receive updates via email</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.emailNotifications}
                          onChange={(e) => setNotifications({ ...notifications, emailNotifications: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">New Music Alerts</h4>
                        <p className="text-gray-400 text-sm">Get notified about new releases</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notifications.newMusicAlerts}
                          onChange={(e) => setNotifications({ ...notifications, newMusicAlerts: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    <button
                      onClick={saveNotifications}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 mt-4"
                    >
                      <Save size={18} />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
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
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={privacy.publicProfile}
                          onChange={(e) => setPrivacy({ ...privacy, publicProfile: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Show Listening Activity</h4>
                        <p className="text-gray-400 text-sm">Let others see what you're listening to</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={privacy.showListeningActivity}
                          onChange={(e) => setPrivacy({ ...privacy, showListeningActivity: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">Data Collection</h4>
                        <p className="text-gray-400 text-sm">Allow data collection for improvements</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={privacy.dataCollection}
                          onChange={(e) => setPrivacy({ ...privacy, dataCollection: e.target.checked })}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-800 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </label>
                    </div>
                    <button
                      onClick={savePrivacy}
                      disabled={loading}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-500 hover:bg-purple-600 text-white rounded-lg transition-colors disabled:opacity-50 mt-4"
                    >
                      <Save size={18} />
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
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
                      <div className="grid grid-cols-3 gap-3">
                        <button
                          onClick={() => handleThemeChange('dark')}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            theme === 'dark'
                              ? 'border-purple-500 bg-purple-500/20 text-white'
                              : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          <Moon size={20} />
                          Dark
                        </button>
                        <button
                          onClick={() => handleThemeChange('light')}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            theme === 'light'
                              ? 'border-purple-500 bg-purple-500/20 text-white'
                              : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          <Sun size={20} />
                          Light
                        </button>
                        <button
                          onClick={() => handleThemeChange('auto')}
                          className={`flex items-center gap-2 px-4 py-3 rounded-lg border-2 transition-all ${
                            theme === 'auto'
                              ? 'border-purple-500 bg-purple-500/20 text-white'
                              : 'border-gray-600 bg-gray-700/50 text-gray-300 hover:border-gray-500'
                          }`}
                        >
                          <Monitor size={20} />
                          Auto
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Accent Color
                      </label>
                      <div className="flex gap-2">
                        {accentColors.map((color) => (
                          <button
                            key={color}
                            onClick={() => setAccentColor(color)}
                            className={`w-12 h-12 rounded-full border-2 transition-all ${
                              accentColor === color ? 'border-white scale-110' : 'border-gray-600 hover:border-gray-400'
                            }`}
                            style={{ backgroundColor: color }}
                            title={color}
                          />
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 mt-2">Accent color changes will be applied after page refresh</p>
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
                        Volume: {volume}%
                      </label>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={volume}
                        onChange={(e) => setVolume(Number(e.target.value))}
                        className="w-full"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Audio Quality
                      </label>
                      <select
                        value={audioQuality}
                        onChange={(e) => setAudioQuality(e.target.value)}
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
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
                      <select
                        value={language}
                        onChange={(e) => handleLanguageChange(e.target.value as 'en' | 'es')}
                        className="w-full px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                      >
                        <option value="en">🇺🇸 English</option>
                        <option value="es">🇪🇸 Español</option>
                      </select>
                      <p className="text-xs text-gray-400 mt-2">Language changes are saved automatically</p>
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
