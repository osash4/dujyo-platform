import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Upload, Music, Video, Gamepad2, FileText, Image, DollarSign, Calendar } from 'lucide-react';
import SimpleAppLayout from '../components/Layout/SimpleAppLayout';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getApiBaseUrl } from '../utils/apiConfig';
import { handleAuthError, getValidToken, fetchWithAutoRefresh } from '../utils/authHelpers';

interface UploadFormData {
  title: string;
  description: string;
  artist: string;
  genre: string;
  price: number;
  file: File | null;
  thumbnail: File | null;
  type: 'audio' | 'video' | 'gaming';
}

const UploadPage: React.FC = () => {
  const { user, getUserRole, hasRole } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'audio' | 'video' | 'gaming'>('audio');
  
  // Redirect listeners to become artist page
  useEffect(() => {
    if (!hasRole('artist')) {
      navigate('/become-artist');
    }
  }, [hasRole, navigate]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState<UploadFormData>({
    title: '',
    description: '',
    artist: user?.displayName || '',
    genre: '',
    price: 0,
    file: null,
    thumbnail: null,
    type: 'audio'
  });

  const tabs = [
    {
      id: 'audio' as const,
      label: 'Music',
      icon: Music,
      color: '#F59E0B',
      description: 'Upload your music tracks'
    },
    {
      id: 'video' as const,
      label: 'Video',
      icon: Video,
      color: '#FBBF24',
      description: 'Upload your video content'
    },
    {
      id: 'gaming' as const,
      label: 'Gaming',
      icon: Gamepad2,
      color: '#EA580C',
      description: 'Upload your gaming content'
    }
  ];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'file' | 'thumbnail') => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        [type]: file
      }));
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.file) {
      setMessage('Please select a file to upload');
      return;
    }
    
    if (!formData.title || !formData.description) {
      setMessage('Please fill in all required fields');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    setMessage('');
    
    try {
      const token = getValidToken();
      if (!token) {
        throw new Error('No authentication token found. Please log in again.');
      }
      
      console.log('📤 Starting content upload...', {
        title: formData.title,
        type: formData.type,
        fileName: formData.file?.name,
        fileSize: formData.file?.size,
        fileType: formData.file?.type,
        hasThumbnail: !!formData.thumbnail,
        user: user?.uid
      });
      
      // Create form data
      const uploadData = new FormData();
      uploadData.append('title', formData.title);
      uploadData.append('description', formData.description);
      uploadData.append('artist', formData.artist);
      uploadData.append('genre', formData.genre);
      uploadData.append('price', formData.price.toString());
      uploadData.append('type', formData.type);
      uploadData.append('file', formData.file!);
      if (formData.thumbnail) {
        uploadData.append('thumbnail', formData.thumbnail);
      }
      uploadData.append('user', user?.uid || '');
      
      console.log('📤 FormData entries:', Array.from(uploadData.entries()).map(([key, value]) => ({
        key,
        value: value instanceof File ? `${value.name} (${value.size} bytes, ${value.type})` : value
      })));
      
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);
      
      // Upload to backend
      const apiBaseUrl = getApiBaseUrl();
      const uploadUrl = `${apiBaseUrl}/api/v1/upload/content`;
      console.log('📤 Sending request to:', uploadUrl);
      
      const response = await fetchWithAutoRefresh(uploadUrl, {
        method: 'POST',
        // Don't set Content-Type header - browser will set it automatically with boundary for FormData
        body: uploadData
      });
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      console.log('📥 Content upload response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      });
      
      // Check for auth errors first
      const isAuthError = await handleAuthError(response, () => {
        setMessage('❌ Your session has expired. Redirecting to login...');
        setTimeout(() => {
          window.location.href = '/login';
        }, 2000);
      });
      
      if (isAuthError) {
        throw new Error('Your session has expired. Please log in again.');
      }
      
      if (!response.ok) {
        // Get more detailed error message
        let errorMessage = 'Upload failed';
        let errorDetails: any = {};
        try {
          const errorText = await response.text();
          console.error('❌ Content upload error response:', errorText);
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
        console.error('❌ Content upload failed:', {
          status: response.status,
          statusText: response.statusText,
          errorMessage,
          errorDetails
        });
        throw new Error(errorMessage);
      }
      
      const result = await response.json();
      console.log('✅ Content upload success:', result);
      
      // ✅ Success message with better feedback
      setMessage(`✅ Successfully uploaded "${formData.title}"! Redirecting to content manager...`);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        artist: user?.displayName || '',
        genre: '',
        price: 0,
        file: null,
        thumbnail: null,
        type: activeTab
      });
      
      // Redirect to content manager after 2 seconds
      setTimeout(() => {
        navigate('/artist/content');
      }, 2000);
      
    } catch (error) {
      console.error('❌ Content upload error:', error);
      if (error instanceof Error) {
        console.error('❌ Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        setMessage(`❌ Error: ${error.message}`);
      } else if (typeof error === 'string') {
        setMessage(`❌ Error: ${error}`);
      } else {
        console.error('❌ Unknown error type:', error);
        setMessage('❌ Error: Upload failed. Please check the console for details.');
      }
    } finally {
      setIsUploading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  const getFileTypes = (type: string) => {
    switch (type) {
      case 'audio':
        return '.mp3,.wav,.flac,.aac,.m4a';
      case 'video':
        return '.mp4,.avi,.mov,.wmv,.mkv';
      case 'gaming':
        return '.exe,.zip,.rar,.7z';
      default:
        return '*';
    }
  };

  const getMaxFileSize = (type: string) => {
    switch (type) {
      case 'audio':
        return '50MB';
      case 'video':
        return '500MB';
      case 'gaming':
        return '2GB';
      default:
        return '100MB';
    }
  };

  return (
    <SimpleAppLayout>
      <div className="min-h-screen text-white" style={{ backgroundColor: 'var(--bg-primary)' }}>
        {/* Hero Section */}
        <div className="relative py-12 px-4">
          <div className="max-w-4xl mx-auto">
            <motion.div
              className="text-center mb-12"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              <h1 className="text-4xl md:text-6xl font-bold mb-4">
                <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-orange-600 bg-clip-text text-transparent">
                  {t('upload.title')}
                </span>
              </h1>
              <p className="text-xl text-gray-300 max-w-2xl mx-auto">
                {t('upload.subtitle')}
              </p>
            </motion.div>

            {/* Content Type Tabs */}
            <div className="flex justify-center mb-8">
              <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-2 border border-gray-700/50">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <motion.button
                      key={tab.id}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setFormData(prev => ({ ...prev, type: tab.id }));
                      }}
                      className={`relative flex items-center gap-3 px-6 py-3 rounded-lg font-medium transition-all duration-300 ${
                        isActive
                          ? 'text-white'
                          : 'text-gray-400 hover:text-gray-300'
                      }`}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                    >
                      {isActive && (
                        <motion.div
                          className="absolute inset-0 rounded-lg"
                          style={{
                            background: `linear-gradient(135deg, ${tab.color}20, transparent)`,
                            border: `2px solid ${tab.color}`,
                            boxShadow: `0 0 20px ${tab.color}50`
                          }}
                          layoutId="activeTab"
                          transition={{ duration: 0.3 }}
                        />
                      )}
                      
                      <div className="relative z-10 flex items-center gap-3">
                        <Icon
                          size={20}
                          style={{ color: isActive ? tab.color : undefined }}
                        />
                        <div className="text-left">
                          <div className="font-semibold">{tab.label}</div>
                          <div className="text-xs opacity-75">{tab.description}</div>
                        </div>
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Upload Form */}
            <motion.div
              className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-8 border border-gray-700/50"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      Title <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      name="title"
                      value={formData.title}
                      onChange={handleInputChange}
                      placeholder="Enter content title"
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      Artist/Creator
                    </label>
                    <input
                      type="text"
                      name="artist"
                      value={formData.artist}
                      onChange={handleInputChange}
                      placeholder="Enter artist name"
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-gray-300 mb-2">
                    Description <span className="text-red-400">*</span>
                  </label>
                  <textarea
                    name="description"
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Describe your content..."
                    rows={4}
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Genre</label>
                    <select
                      name="genre"
                      value={formData.genre}
                      onChange={handleInputChange}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    >
                      <option value="">Select genre</option>
                      {activeTab === 'audio' && (
                        <>
                          <option value="Electronic">Electronic</option>
                          <option value="Hip Hop">Hip Hop</option>
                          <option value="Rock">Rock</option>
                          <option value="Pop">Pop</option>
                          <option value="Jazz">Jazz</option>
                          <option value="Classical">Classical</option>
                        </>
                      )}
                      {activeTab === 'video' && (
                        <>
                          <option value="Documentary">Documentary</option>
                          <option value="Tutorial">Tutorial</option>
                          <option value="Entertainment">Entertainment</option>
                          <option value="Educational">Educational</option>
                          <option value="Music Video">Music Video</option>
                        </>
                      )}
                      {activeTab === 'gaming' && (
                        <>
                          <option value="Action">Action</option>
                          <option value="Adventure">Adventure</option>
                          <option value="Puzzle">Puzzle</option>
                          <option value="Strategy">Strategy</option>
                          <option value="RPG">RPG</option>
                        </>
                      )}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      Price (DYO) <span className="text-gray-400">(0 = Free)</span>
                    </label>
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      placeholder="0"
                      min="0"
                      step="0.01"
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </div>

                {/* File Upload */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">
                      {activeTab === 'audio' ? 'Audio File' : activeTab === 'video' ? 'Video File' : 'Game File'} <span className="text-red-400">*</span>
                    </label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                      <input
                        type="file"
                        accept={getFileTypes(activeTab)}
                        onChange={(e) => handleFileChange(e, 'file')}
                        className="hidden"
                        id="file-upload"
                        required
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-300 mb-2">
                          {formData.file ? formData.file.name : `Click to upload ${activeTab} file`}
                        </p>
                        <p className="text-sm text-gray-400">
                          Max size: {getMaxFileSize(activeTab)} | Supported: {getFileTypes(activeTab)}
                        </p>
                      </label>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm text-gray-300 mb-2">Thumbnail (Optional)</label>
                    <div className="border-2 border-dashed border-gray-600 rounded-lg p-6 text-center hover:border-amber-400 transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => handleFileChange(e, 'thumbnail')}
                        className="hidden"
                        id="thumbnail-upload"
                      />
                      <label htmlFor="thumbnail-upload" className="cursor-pointer">
                        <Image className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-300 mb-2">
                          {formData.thumbnail ? formData.thumbnail.name : 'Click to upload thumbnail'}
                        </p>
                        <p className="text-sm text-gray-400">
                          Max size: 10MB | Supported: .jpg, .png, .gif
                        </p>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Upload Progress */}
                {isUploading && (
                  <motion.div
                    className="space-y-2"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  >
                    <div className="flex justify-between text-sm text-gray-300">
                      <span>Uploading...</span>
                      <span>{uploadProgress}%</span>
                    </div>
                    <div className="w-full bg-gray-700 rounded-full h-2">
                      <motion.div
                        className="bg-gradient-to-r from-amber-500 to-orange-500 h-2 rounded-full"
                        initial={{ width: 0 }}
                        animate={{ width: `${uploadProgress}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isUploading}
                  className="btn-primary w-full py-4"
                >
                  {isUploading ? 'Uploading...' : `Upload ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} Content`}
                </button>

                {/* Message */}
                {message && (
                  <motion.div
                    className={`p-4 rounded-lg ${
                      message.includes('Error') 
                        ? 'bg-red-500/20 border border-red-500/50 text-red-400'
                        : 'bg-green-500/20 border border-green-500/50 text-green-400'
                    }`}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                  >
                    {message}
                  </motion.div>
                )}
              </form>
            </motion.div>
          </div>
        </div>
      </div>
    </SimpleAppLayout>
  );
};

export default UploadPage;
