import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Play, 
  Pause, 
  Volume2, 
  VolumeX, 
  Settings, 
  Trash2, 
  Edit3,
  Eye,
  Download,
  Share2,
  Clock,
  FileVideo,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface VideoFile {
  id: string;
  title: string;
  description: string;
  duration: number;
  size: number;
  quality: string;
  category: string;
  thumbnail: string;
  uploadDate: Date;
  views: number;
  status: 'processing' | 'ready' | 'error';
  url: string;
}

const VideoManager: React.FC = () => {
  const [videos, setVideos] = useState<VideoFile[]>([
    {
      id: '1',
      title: 'My First Video',
      description: 'A sample video upload',
      duration: 180,
      size: 45.2,
      quality: '1080p',
      category: 'Music Video',
      thumbnail: '/api/placeholder/300/200',
      uploadDate: new Date(),
      views: 1250,
      status: 'ready',
      url: '/api/video/1'
    }
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: '',
    description: '',
    category: 'Music Video',
    quality: '1080p'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(0)} KB`;
    }
    return `${sizeInMB.toFixed(1)} MB`;
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          setIsUploading(false);
          setShowUploadModal(false);
          
          // Add new video to list
          const newVideoFile: VideoFile = {
            id: Date.now().toString(),
            title: newVideo.title || file.name,
            description: newVideo.description,
            duration: 0, // Would be calculated from actual video
            size: file.size / (1024 * 1024), // Convert to MB
            quality: newVideo.quality,
            category: newVideo.category,
            thumbnail: '/api/placeholder/300/200',
            uploadDate: new Date(),
            views: 0,
            status: 'processing',
            url: URL.createObjectURL(file)
          };

          setVideos(prev => [newVideoFile, ...prev]);
          setNewVideo({ title: '', description: '', category: 'Music Video', quality: '1080p' });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleDeleteVideo = (videoId: string) => {
    setVideos(prev => prev.filter(video => video.id !== videoId));
  };

  const getStatusIcon = (status: VideoFile['status']) => {
    switch (status) {
      case 'ready':
        return <CheckCircle size={16} className="text-green-400" />;
      case 'processing':
        return <Clock size={16} className="text-yellow-400 animate-spin" />;
      case 'error':
        return <AlertCircle size={16} className="text-red-400" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Video Content</h2>
          <p className="text-gray-400">Upload and manage your video content</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 flex items-center gap-2"
        >
          <Upload size={20} />
          Upload Video
        </button>
      </div>

      {/* Upload Modal */}
      {showUploadModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
          onClick={() => setShowUploadModal(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">Upload New Video</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Video File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newVideo.title}
                  onChange={(e) => setNewVideo(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter video title"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newVideo.description}
                  onChange={(e) => setNewVideo(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter video description"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={newVideo.category}
                    onChange={(e) => setNewVideo(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Music Video">Music Video</option>
                    <option value="Tutorial">Tutorial</option>
                    <option value="Live Performance">Live Performance</option>
                    <option value="Behind the Scenes">Behind the Scenes</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Quality
                  </label>
                  <select
                    value={newVideo.quality}
                    onChange={(e) => setNewVideo(prev => ({ ...prev, quality: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="4K">4K</option>
                  </select>
                </div>
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-blue-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Videos Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {videos.map((video, index) => (
          <motion.div
            key={video.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-gray-600/50 transition-all duration-300"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-700">
              <img
                src={video.thumbnail}
                alt={video.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <button className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white/30 transition-all duration-300">
                  <Play size={24} className="text-white ml-1" />
                </button>
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                {getStatusIcon(video.status)}
                <span className="text-white text-xs">{video.status}</span>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                <span className="text-white text-xs">{formatDuration(video.duration)}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                {video.title}
              </h3>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                {video.description}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <span>{video.category}</span>
                <span>{video.quality}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                <div className="flex items-center gap-1">
                  <Eye size={14} />
                  <span>{video.views.toLocaleString()}</span>
                </div>
                <span>{formatFileSize(video.size)}</span>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Edit3 size={16} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Share2 size={16} />
                  </button>
                  <button className="p-2 text-gray-400 hover:text-white transition-colors">
                    <Download size={16} />
                  </button>
                </div>
                <button
                  onClick={() => handleDeleteVideo(video.id)}
                  className="p-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {videos.length === 0 && (
        <div className="text-center py-12">
          <FileVideo size={64} className="text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Videos Yet</h3>
          <p className="text-gray-400 mb-6">Upload your first video to get started</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
          >
            Upload Your First Video
          </button>
        </div>
      )}
    </div>
  );
};

export default VideoManager;
