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
  CheckCircle,
  X,
  Moon,
  Sun,
  Monitor,
  LogOut
} from 'lucide-react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { useTheme } from '../contexts/ThemeContext';
import { getApiBaseUrl } from '../utils/apiConfig';
import { handleAuthError, getValidToken, fetchWithAutoRefresh } from '../utils/authHelpers';

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
  const { user, signOut, updateUser } = useAuth();
  const { language, setLanguage, t } = useLanguage();
  const { theme, setTheme } = useTheme();
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

  // Update avatarUrl when user photoURL changes (but only if we don't have a preview or file)
  useEffect(() => {
    // Only sync if we don't have a pending upload (avatarFile or avatarPreview)
    // AND if the user.photoURL is different from current avatarUrl
    // AND if avatarUrl is empty or different (to avoid unnecessary updates)
    if (user?.photoURL && user.photoURL !== avatarUrl && !avatarFile && !avatarPreview) {
      console.log('🔄 Syncing avatarUrl from user.photoURL:', user.photoURL);
      console.log('🔄 Current avatarUrl:', avatarUrl);
      setAvatarUrl(user.photoURL);
    }
  }, [user?.photoURL, avatarFile, avatarPreview, avatarUrl]);

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
        // Build full URL if avatar_url is a relative path
        let newAvatarUrl = data.avatar_url || user.photoURL || '';
        if (newAvatarUrl && !newAvatarUrl.startsWith('http')) {
          const apiBaseUrl = getApiBaseUrl();
          newAvatarUrl = `${apiBaseUrl}${newAvatarUrl.startsWith('/') ? '' : '/'}${newAvatarUrl}`;
        }
        setAvatarUrl(newAvatarUrl);
        // Also update user context if avatar changed
        if (newAvatarUrl && newAvatarUrl !== user.photoURL) {
          updateUser({ photoURL: newAvatarUrl });
        }
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
    console.log('🚀 [uploadAvatar] Function called');
    console.log('🚀 [uploadAvatar] avatarFile:', avatarFile);
    console.log('🚀 [uploadAvatar] avatarUrl:', avatarUrl);
    
    if (!avatarFile) {
      console.log('⚠️ [uploadAvatar] No avatarFile, returning existing avatarUrl:', avatarUrl);
      return avatarUrl;
    }
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = getValidToken();
      
      console.log('📤 [uploadAvatar] Starting avatar upload...', {
        apiBaseUrl,
        hasToken: !!token,
        fileName: avatarFile.name,
        fileSize: avatarFile.size,
        fileType: avatarFile.type
      });
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      const formData = new FormData();
      formData.append('avatar', avatarFile);
      
      const uploadUrl = `${apiBaseUrl}/api/v1/user/avatar`;
      console.log('📤 [uploadAvatar] Sending request to:', uploadUrl);
      console.log('📤 [uploadAvatar] FormData entries:', Array.from(formData.entries()).map(([key, value]) => ({
        key,
        value: value instanceof File ? `${value.name} (${value.size} bytes)` : value
      })));
      console.log('📤 [uploadAvatar] Request config:', {
        method: 'POST',
        hasBody: !!formData,
        tokenLength: token.length
      });
      
      let response: Response;
      try {
        response = await fetchWithAutoRefresh(uploadUrl, {
          method: 'POST',
          // Don't set Content-Type header - browser will set it automatically with boundary for FormData
          body: formData,
        });
      } catch (fetchError) {
        console.error('❌ [uploadAvatar] Fetch error (network/CORS):', fetchError);
        console.error('❌ [uploadAvatar] Error details:', {
          message: fetchError instanceof Error ? fetchError.message : String(fetchError),
          name: fetchError instanceof Error ? fetchError.name : 'Unknown',
          stack: fetchError instanceof Error ? fetchError.stack : undefined
        });
        throw new Error(`Network error: ${fetchError instanceof Error ? fetchError.message : 'Failed to connect to server. Please check your internet connection and try again.'}`);
      }
      
      console.log('📥 Avatar upload response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Check for auth errors first
      const isAuthError = await handleAuthError(response, () => {
        setSaveStatus('error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      });
      
      if (isAuthError) {
        throw new Error('Your session has expired. Please log in again.');
      }
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Avatar upload success:', data);
        // Build full URL if avatar_url is a relative path
        let avatarUrl = data.avatar_url || null;
        if (avatarUrl && !avatarUrl.startsWith('http')) {
          // If it's a relative path, prepend the API base URL
          avatarUrl = `${apiBaseUrl}${avatarUrl.startsWith('/') ? '' : '/'}${avatarUrl}`;
        }
        console.log('✅ Avatar URL (full):', avatarUrl);
        return avatarUrl;
      } else {
        // Get more detailed error message
        let errorMessage = 'Failed to upload avatar';
        let errorDetails: any = {};
        try {
          const errorText = await response.text();
          console.error('❌ Avatar upload error response:', errorText);
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorData.error || errorMessage;
            errorDetails = errorData;
          } catch {
            errorMessage = errorText || errorMessage;
          }
        } catch {
          errorMessage = `Upload failed: ${response.status} ${response.statusText}`;
        }
        console.error('❌ Avatar upload failed:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          errorDetails
        });
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error uploading avatar:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
      }
      throw error;
    }
  };

  const saveProfile = async () => {
    console.log('🚀🚀🚀 [saveProfile] FUNCTION CALLED 🚀🚀🚀');
    console.log('🚀 [saveProfile] Starting profile save...');
    console.log('🚀 [saveProfile] Current state:', {
      displayName,
      bio,
      avatarUrl,
      hasAvatarFile: !!avatarFile,
      avatarFileName: avatarFile?.name,
      userPhotoURL: user?.photoURL
    });
    
    setLoading(true);
    setSaveStatus('saving');
    console.log('✅ [saveProfile] State updated: loading=true, saveStatus=saving');
    
    try {
      const apiBaseUrl = getApiBaseUrl();
      const token = getValidToken();
      
      console.log('🔐 [saveProfile] Auth check:', {
        apiBaseUrl,
        hasToken: !!token,
        tokenLength: token?.length
      });
      
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      // Upload avatar first if changed
      let finalAvatarUrl = avatarUrl;
      if (avatarFile) {
        try {
          console.log('📤 [saveProfile] Uploading avatar file...', {
            fileName: avatarFile.name,
            fileSize: avatarFile.size,
            fileType: avatarFile.type
          });
          const uploadedUrl = await uploadAvatar();
          console.log('📥 [saveProfile] Upload avatar response:', uploadedUrl);
          if (uploadedUrl) {
            finalAvatarUrl = uploadedUrl;
            console.log('✅ [saveProfile] Avatar uploaded successfully, URL:', finalAvatarUrl);
          } else {
            console.warn('⚠️ [saveProfile] Avatar upload returned null, using existing avatarUrl:', avatarUrl);
          }
        } catch (uploadError) {
          // If avatar upload fails, continue with profile update but show warning
          console.error('❌ [saveProfile] Avatar upload failed, continuing with profile update:', uploadError);
          // Don't throw - allow profile to be saved even if avatar upload fails
        }
      } else {
        console.log('ℹ️ [saveProfile] No avatar file to upload, using existing avatarUrl:', avatarUrl);
      }
      
      console.log('📤 [saveProfile] Final avatar URL before profile update:', finalAvatarUrl);
      
      // Update profile
      console.log('📤 [saveProfile] Sending profile update request:', {
        display_name: displayName,
        bio: bio,
        avatar_url: finalAvatarUrl
      });
      
      const response = await fetchWithAutoRefresh(`${apiBaseUrl}/api/v1/user/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          display_name: displayName,
          bio: bio,
          avatar_url: finalAvatarUrl,
        }),
      });
      
      console.log('📥 [saveProfile] Profile update response status:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      // Check for auth errors first
      const isAuthError = await handleAuthError(response, () => {
        console.error('❌ [saveProfile] Auth error detected');
        setSaveStatus('error');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      });
      
      if (isAuthError) {
        throw new Error('Your session has expired. Please log in again.');
      }
      
      if (response.ok) {
        // Get updated profile data from response
        const profileData = await response.json();
        console.log('✅ [saveProfile] Profile update response:', profileData);
        
        // Build full URL if avatar_url is a relative path
        let newAvatarUrl = profileData.avatar_url || finalAvatarUrl;
        console.log('🔍 [saveProfile] Avatar URL from response:', {
          profileDataAvatarUrl: profileData.avatar_url,
          finalAvatarUrl,
          newAvatarUrl
        });
        
        if (newAvatarUrl && !newAvatarUrl.startsWith('http')) {
          newAvatarUrl = `${apiBaseUrl}${newAvatarUrl.startsWith('/') ? '' : '/'}${newAvatarUrl}`;
          console.log('🔧 [saveProfile] Built full URL:', newAvatarUrl);
        }
        console.log('✅ [saveProfile] Final avatar URL:', newAvatarUrl);
        
        // Update local state FIRST with the new avatar URL
        console.log('💾 [saveProfile] Updating local state with avatar URL:', newAvatarUrl);
        setAvatarFile(null);
        setAvatarPreview(null);
        // Use setTimeout to ensure state updates happen in correct order
        setTimeout(() => {
          setAvatarUrl(newAvatarUrl);
        }, 0);
        
        // Update AuthContext with new data (this will update all components using user)
        console.log('💾 [saveProfile] Updating AuthContext with:', {
          displayName: profileData.display_name || displayName,
          photoURL: newAvatarUrl
        });
        updateUser({
          displayName: profileData.display_name || displayName,
          photoURL: newAvatarUrl,
        });
        
        // Force a re-render by updating avatarUrl after a short delay
        // This ensures the image src is updated even if there's a cache issue
        setTimeout(() => {
          console.log('🔄 [saveProfile] Force updating avatarUrl to:', newAvatarUrl);
          setAvatarUrl(newAvatarUrl);
        }, 100);
        
        // Don't refresh from backend immediately - we already have the latest data from the response
        // The refresh would overwrite our just-updated values if the backend hasn't fully propagated yet
        console.log('✅ [saveProfile] Profile saved successfully. Using data from response:', {
          displayName: profileData.display_name || displayName,
          photoURL: newAvatarUrl
        });
        
        setSaveStatus('success');
        setTimeout(() => setSaveStatus('idle'), 2000);
      } else {
        // Get more detailed error message
        let errorMessage = 'Failed to save profile';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorData.error || errorMessage;
        } catch {
          errorMessage = `Save failed: ${response.status} ${response.statusText}`;
        }
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('❌ Error saving profile:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        // Show user-friendly error message
        setSaveStatus('error');
        // Show error message for longer if it's a critical error
        setTimeout(() => setSaveStatus('idle'), 5000);
      } else {
        console.error('❌ Unknown error type:', error);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus('idle'), 5000);
      }
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
    // Trigger a page refresh to apply translations everywhere
    setSaveStatus('success');
    setTimeout(() => {
      setSaveStatus('idle');
      // Force re-render of components that use translations
      window.dispatchEvent(new CustomEvent('languageChanged', { detail: { language: newLanguage } }));
    }, 2000);
  };

  const handleThemeChange = (newTheme: 'dark' | 'light' | 'auto') => {
    setTheme(newTheme);
    // Theme is automatically applied by ThemeContext
    setSaveStatus('success');
    setTimeout(() => setSaveStatus('idle'), 2000);
  };

  const settingsTabs = [
    { id: 'profile', label: t('settings.profile'), icon: User },
    { id: 'notifications', label: t('settings.notifications'), icon: Bell },
    { id: 'privacy', label: t('settings.privacy'), icon: Shield },
    { id: 'appearance', label: t('settings.appearance'), icon: Palette },
    { id: 'audio', label: t('settings.audio'), icon: Volume2 },
    { id: 'language', label: t('settings.language'), icon: Globe },
    { id: 'data', label: t('settings.data'), icon: Download },
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
              <h3 className="text-lg font-semibold text-white mb-4">{t('settings.title')}</h3>
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
              
              {/* Sign Out Button */}
              <div className="mt-4 pt-4 border-t border-gray-700/50">
                <button
                  onClick={async () => {
                    await signOut();
                    window.location.href = '/';
                  }}
                  className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-red-400 hover:bg-red-500/20 hover:text-red-300"
                >
                  <LogOut size={18} />
                  {t('auth.logout')}
                </button>
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
                    {saveStatus === 'success' && t('settings.saved')}
                    {saveStatus === 'error' && t('settings.error')}
                    {saveStatus === 'saving' && t('settings.saving')}
                  </span>
                </motion.div>
              )}

              {activeTab === 'profile' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">{t('settings.profileSettings')}</h3>
                  <div className="space-y-6">
                    {/* Avatar Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Profile Picture
                      </label>
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          {(() => {
                            // Get valid avatar URL - skip empty strings and example.com
                            const validPhotoUrl = (avatarPreview || avatarUrl || user?.photoURL || '').trim();
                            const hasValidUrl = validPhotoUrl && 
                                              !validPhotoUrl.includes('example.com') && 
                                              validPhotoUrl.length > 0 &&
                                              (validPhotoUrl.startsWith('http') || validPhotoUrl.startsWith('/'));
                            
                            // If we have a valid URL, try to show it
                            if (hasValidUrl) {
                              const imageUrl = validPhotoUrl.includes('localhost:8083') 
                                ? validPhotoUrl.split('?')[0] // Remove query params for local images
                                : validPhotoUrl;
                              
                              return (
                                <img
                                  key={`avatar-${imageUrl}`}
                                  src={imageUrl}
                                  alt="Avatar"
                                  className="w-24 h-24 rounded-full object-cover border-2 border-purple-500"
                                  crossOrigin="anonymous"
                                  onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    console.error('❌ [SettingsPage] Avatar image failed to load:', target.src);
                                    // Hide image and show icon instead
                                    target.style.display = 'none';
                                    // Trigger re-render to show icon
                                    const parent = target.parentElement;
                                    if (parent && !parent.querySelector('.avatar-icon-fallback')) {
                                      const icon = document.createElement('div');
                                      icon.className = 'avatar-icon-fallback w-24 h-24 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center border-2 border-purple-500';
                                      icon.innerHTML = `<svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>`;
                                      parent.appendChild(icon);
                                    }
                                  }}
                                  onLoad={() => {
                                    console.log('✅ [SettingsPage] Avatar image loaded successfully:', imageUrl);
                                    // Remove any fallback icon if image loads
                                    const parent = (e.target as HTMLImageElement).parentElement;
                                    const fallback = parent?.querySelector('.avatar-icon-fallback');
                                    if (fallback) {
                                      fallback.remove();
                                    }
                                  }}
                                />
                              );
                            }
                            
                            // No valid URL - show icon directly (no image attempt)
                            return (
                              <div className="w-24 h-24 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 flex items-center justify-center border-2 border-purple-500">
                                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
                                </svg>
                              </div>
                            );
                          })()}
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
                            {t('settings.uploadPhoto')}
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
                        {t('settings.displayName')}
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
                        {t('settings.bio')}
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
                      {loading ? t('settings.saving') : t('settings.saveChanges')}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'notifications' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">{t('settings.notificationSettings')}</h3>
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
                        <h4 className="text-white font-medium">{t('settings.emailNotifications')}</h4>
                        <p className="text-gray-400 text-sm">{t('settings.emailNotificationsDesc')}</p>
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
                        <h4 className="text-white font-medium">{t('settings.newMusicAlerts')}</h4>
                        <p className="text-gray-400 text-sm">{t('settings.newMusicAlertsDesc')}</p>
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
                      {loading ? t('settings.saving') : t('settings.saveChanges')}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'privacy' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">{t('settings.privacySettings')}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-white font-medium">{t('settings.publicProfile')}</h4>
                        <p className="text-gray-400 text-sm">{t('settings.publicProfileDesc')}</p>
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
                        <h4 className="text-white font-medium">{t('settings.showListeningActivity')}</h4>
                        <p className="text-gray-400 text-sm">{t('settings.showListeningActivityDesc')}</p>
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
                        <h4 className="text-white font-medium">{t('settings.dataCollection')}</h4>
                        <p className="text-gray-400 text-sm">{t('settings.dataCollectionDesc')}</p>
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
                      {loading ? t('settings.saving') : t('settings.saveChanges')}
                    </button>
                  </div>
                </div>
              )}

              {activeTab === 'appearance' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">{t('settings.appearanceSettings')}</h3>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t('settings.theme')}
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
                          {t('settings.dark')}
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
                          {t('settings.light')}
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
                          {t('settings.auto')}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        {t('settings.accentColor')}
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
                      <p className="text-xs text-gray-400 mt-2">{t('settings.accentColorDesc')}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'audio' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">{t('settings.audioSettings')}</h3>
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
                  <h3 className="text-2xl font-semibold text-white mb-6">{t('settings.languageSettings')}</h3>
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
                      <p className="text-xs text-gray-400 mt-2">{t('settings.languageDesc')}</p>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'data' && (
                <div>
                  <h3 className="text-2xl font-semibold text-white mb-6">{t('settings.dataManagement')}</h3>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                      <div>
                        <h4 className="text-white font-medium">{t('settings.downloadData')}</h4>
                        <p className="text-gray-400 text-sm">{t('settings.downloadDataDesc')}</p>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors">
                        <Download size={18} />
                        {t('settings.download')}
                      </button>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-gray-700/30 rounded-lg">
                      <div>
                        <h4 className="text-white font-medium">{t('settings.deleteAccount')}</h4>
                        <p className="text-gray-400 text-sm">{t('settings.deleteAccountDesc')}</p>
                      </div>
                      <button className="flex items-center gap-2 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors">
                        <Trash2 size={18} />
                        {t('settings.delete')}
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
