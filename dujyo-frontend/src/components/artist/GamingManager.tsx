import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Upload, 
  Play, 
  Settings, 
  Trash2, 
  Edit3,
  Eye,
  Download,
  Share2,
  Clock,
  Gamepad2,
  CheckCircle,
  AlertCircle,
  Trophy,
  Star,
  Users,
  Zap
} from 'lucide-react';

interface GameAsset {
  id: string;
  title: string;
  description: string;
  type: 'game' | 'asset' | 'mod' | 'texture';
  version: string;
  size: number;
  category: string;
  thumbnail: string;
  uploadDate: Date;
  downloads: number;
  rating: number;
  status: 'processing' | 'ready' | 'error';
  url: string;
  tags: string[];
  requirements: {
    platform: string;
    engine: string;
    minVersion: string;
  };
}

const GamingManager: React.FC = () => {
  const [gameAssets, setGameAssets] = useState<GameAsset[]>([
    {
      id: '1',
      title: 'Cyberpunk Music Pack',
      description: 'A collection of futuristic music tracks for cyberpunk games',
      type: 'asset',
      version: '1.0.0',
      size: 125.8,
      category: 'Audio',
      thumbnail: '/api/placeholder/300/200',
      uploadDate: new Date(),
      downloads: 2450,
      rating: 4.8,
      status: 'ready',
      url: '/api/game/1',
      tags: ['cyberpunk', 'music', 'futuristic'],
      requirements: {
        platform: 'Unity',
        engine: 'Unity 2022.3+',
        minVersion: '1.0.0'
      }
    }
  ]);

  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [newAsset, setNewAsset] = useState({
    title: '',
    description: '',
    type: 'asset' as GameAsset['type'],
    category: 'Audio',
    platform: 'Unity',
    engine: 'Unity 2022.3+',
    tags: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatFileSize = (sizeInMB: number) => {
    if (sizeInMB < 1) {
      return `${(sizeInMB * 1024).toFixed(0)} KB`;
    }
    if (sizeInMB < 1024) {
      return `${sizeInMB.toFixed(1)} MB`;
    }
    return `${(sizeInMB / 1024).toFixed(1)} GB`;
  };

  const getTypeIcon = (type: GameAsset['type']) => {
    switch (type) {
      case 'game':
        return <Gamepad2 size={16} className="text-blue-400" />;
      case 'asset':
        return <Zap size={16} className="text-yellow-400" />;
      case 'mod':
        return <Settings size={16} className="text-green-400" />;
      case 'texture':
        return <Star size={16} className="text-purple-400" />;
      default:
        return <Gamepad2 size={16} className="text-gray-400" />;
    }
  };

  const getStatusIcon = (status: GameAsset['status']) => {
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
          
          // Add new asset to list
          const newGameAsset: GameAsset = {
            id: Date.now().toString(),
            title: newAsset.title || file.name,
            description: newAsset.description,
            type: newAsset.type,
            version: '1.0.0',
            size: file.size / (1024 * 1024), // Convert to MB
            category: newAsset.category,
            thumbnail: '/api/placeholder/300/200',
            uploadDate: new Date(),
            downloads: 0,
            rating: 0,
            status: 'processing',
            url: URL.createObjectURL(file),
            tags: newAsset.tags.split(',').map(tag => tag.trim()).filter(Boolean),
            requirements: {
              platform: newAsset.platform,
              engine: newAsset.engine,
              minVersion: '1.0.0'
            }
          };

          setGameAssets(prev => [newGameAsset, ...prev]);
          setNewAsset({ 
            title: '', 
            description: '', 
            type: 'asset', 
            category: 'Audio', 
            platform: 'Unity', 
            engine: 'Unity 2022.3+', 
            tags: '' 
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const handleDeleteAsset = (assetId: string) => {
    setGameAssets(prev => prev.filter(asset => asset.id !== assetId));
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        size={14}
        className={i < Math.floor(rating) ? 'text-yellow-400 fill-current' : 'text-gray-400'}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Gaming Content</h2>
          <p className="text-gray-400">Upload and manage your gaming content and assets</p>
        </div>
        <button
          onClick={() => setShowUploadModal(true)}
          className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 flex items-center gap-2"
        >
          <Upload size={20} />
          Upload Asset
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
            className="bg-gray-800 p-6 rounded-xl border border-gray-700 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold text-white mb-4">Upload Gaming Asset</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Asset File
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".zip,.rar,.7z,.unitypackage,.fbx,.obj,.png,.jpg,.wav,.mp3"
                  onChange={handleFileUpload}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-green-500 file:text-white hover:file:bg-green-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Title
                </label>
                <input
                  type="text"
                  value={newAsset.title}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Enter asset title"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Description
                </label>
                <textarea
                  value={newAsset.description}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter asset description"
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Type
                  </label>
                  <select
                    value={newAsset.type}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, type: e.target.value as GameAsset['type'] }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="asset">Asset</option>
                    <option value="game">Game</option>
                    <option value="mod">Mod</option>
                    <option value="texture">Texture</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <select
                    value={newAsset.category}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Audio">Audio</option>
                    <option value="3D Models">3D Models</option>
                    <option value="Textures">Textures</option>
                    <option value="Scripts">Scripts</option>
                    <option value="UI">UI</option>
                    <option value="Effects">Effects</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Platform
                  </label>
                  <select
                    value={newAsset.platform}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, platform: e.target.value }))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    <option value="Unity">Unity</option>
                    <option value="Unreal Engine">Unreal Engine</option>
                    <option value="Godot">Godot</option>
                    <option value="WebGL">WebGL</option>
                    <option value="Mobile">Mobile</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Engine Version
                  </label>
                  <input
                    type="text"
                    value={newAsset.engine}
                    onChange={(e) => setNewAsset(prev => ({ ...prev, engine: e.target.value }))}
                    placeholder="e.g., Unity 2022.3+"
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newAsset.tags}
                  onChange={(e) => setNewAsset(prev => ({ ...prev, tags: e.target.value }))}
                  placeholder="e.g., cyberpunk, music, futuristic"
                  className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500"
                />
              </div>

              {isUploading && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-300">
                    <span>Uploading...</span>
                    <span>{uploadProgress}%</span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div 
                      className="bg-green-500 h-2 rounded-full transition-all duration-300"
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
                  className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 disabled:from-gray-600 disabled:to-gray-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 disabled:cursor-not-allowed"
                >
                  {isUploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* Assets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {gameAssets.map((asset, index) => (
          <motion.div
            key={asset.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-gray-800/50 rounded-xl border border-gray-700/50 overflow-hidden hover:border-gray-600/50 transition-all duration-300"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-gray-700">
              <img
                src={asset.thumbnail}
                alt={asset.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  {getTypeIcon(asset.type)}
                </div>
              </div>
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                {getTypeIcon(asset.type)}
                <span className="text-white text-xs capitalize">{asset.type}</span>
              </div>
              <div className="absolute top-2 right-2 flex items-center gap-1 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                {getStatusIcon(asset.status)}
                <span className="text-white text-xs">{asset.status}</span>
              </div>
              <div className="absolute bottom-2 right-2 bg-black/50 backdrop-blur-sm px-2 py-1 rounded">
                <span className="text-white text-xs">{formatFileSize(asset.size)}</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              <h3 className="text-lg font-semibold text-white mb-2 line-clamp-2">
                {asset.title}
              </h3>
              <p className="text-gray-400 text-sm mb-3 line-clamp-2">
                {asset.description}
              </p>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <span>{asset.category}</span>
                <span>v{asset.version}</span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                  <Download size={14} />
                  <span>{asset.downloads.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-1">
                  {renderStars(asset.rating)}
                  <span className="ml-1">{asset.rating}</span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-4">
                {asset.tags.slice(0, 3).map((tag, tagIndex) => (
                  <span
                    key={tagIndex}
                    className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded"
                  >
                    {tag}
                  </span>
                ))}
                {asset.tags.length > 3 && (
                  <span className="px-2 py-1 bg-gray-700 text-gray-300 text-xs rounded">
                    +{asset.tags.length - 3}
                  </span>
                )}
              </div>

              <div className="text-xs text-gray-500 mb-4">
                <div>Platform: {asset.requirements.platform}</div>
                <div>Engine: {asset.requirements.engine}</div>
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
                  onClick={() => handleDeleteAsset(asset.id)}
                  className="p-2 text-red-400 hover:text-red-300 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {gameAssets.length === 0 && (
        <div className="text-center py-12">
          <Gamepad2 size={64} className="text-gray-500 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Gaming Assets Yet</h3>
          <p className="text-gray-400 mb-6">Upload your first gaming asset to get started</p>
          <button
            onClick={() => setShowUploadModal(true)}
            className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-300"
          >
            Upload Your First Asset
          </button>
        </div>
      )}
    </div>
  );
};

export default GamingManager;
